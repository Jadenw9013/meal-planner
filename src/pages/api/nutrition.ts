// pages/api/nutrition.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'

type MealPlan = { meals: string[]; calories: number; protein: number }
type Resp     = { plan?: MealPlan; error?: string }

/** Harris–Benedict BMR formula */
function calculateBMR(
  gender: 'male' | 'female',
  weightKg: number,
  heightCm: number,
  age: number
): number {
  const weightLbs = weightKg * 2.20462
  const heightIn  = heightCm  / 2.54
  if (gender === 'male') {
    return (66 + 6.23 * weightLbs + 12.7 * heightIn - 6.8 * age) * 1.5
  }
  return (655 + 4.35 * weightLbs + 4.7 * heightIn - 4.7 * age) * 1.5
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Resp>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const { gender, age, height, weight, bodyFat, goal, allergies } = req.body
  const openaiKey = process.env.OPENAI_KEY
  if (!openaiKey) {
    return res.status(500).json({ error: 'Missing OPENAI_KEY' })
  }

  // Read prompt from file
  const promptPath = path.join(process.cwd(), 'prompt', 'instructions.txt')
  const basePrompt = fs.readFileSync(promptPath, 'utf8')

  // Compose user-specific prompt
  const bmr = calculateBMR(gender, weight, height, age)
  let calMin = bmr, calMax = bmr

  if (goal === 'cut') {
    calMin = bmr - 500
    calMax = bmr - 350
  } else if (goal === 'bulk') {
    calMin = bmr + 200
    calMax = bmr + 500
  }

  const calorieRangeText =
    `\nThe total calories for the meal plan must be between ${Math.round(calMin)} and ${Math.round(calMax)} kcal.`

  const userPrompt =
    basePrompt +
    `\nUser stats: Age ${age} yrs, Height ${height} cm, Weight ${weight} kg, Body fat ${bodyFat}%, BMR ${bmr.toFixed(0)} kcal/day, Goal: ${goal}, Allergies: ${allergies || 'none'}.` +
    calorieRangeText

  try {
    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        Authorization: `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a precise nutrition assistant.' },
          { role: 'user',   content: userPrompt }
        ]
      })
    })

    const result = await aiRes.json()
    const raw    = result.choices?.[0]?.message?.content.trim() || ''

    // robust JSON parse
    let plan: MealPlan
    try {
      plan = JSON.parse(raw)
    } catch {
      const m = raw.match(/\{[\s\S]*\}/)
      if (!m) throw new Error('Invalid JSON from AI')
      plan = JSON.parse(m[0])
    }


    return res.status(200).json({ plan })
  } catch (err: any) {
    console.error('Nutrition API error:', err)
    return res.status(500).json({ error: err.message || 'Unknown error' })
  }
}
