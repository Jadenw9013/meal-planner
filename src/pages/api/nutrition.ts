import type { NextApiRequest, NextApiResponse } from 'next'

type MealPlan = { meals: string[]; calories: number; protein: number }
type Resp = { plan?: MealPlan; error?: string }

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Resp>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const { age, height, weight, bodyFat, goal, allergies } = req.body
  const openaiKey = process.env.OPENAI_KEY
  if (!openaiKey) {
    return res.status(500).json({ error: 'Missing OPENAI_KEY' })
  }

  // Construct user prompt with strict JSON output instruction
  const userPrompt = `Age: ${age} years; Height: ${height} cm; Weight: ${weight} kg; ` +
    `Body fat: ${bodyFat}% estimated; Goal: ${goal}; Allergies: ${allergies || 'none'}. ` +
    `Create a 5-meal daily plan for a bodybuilder that meets protein requirements and total calories to match the goal. Prioritize whole foods and meats. ` +
    `Respond ONLY with a JSON object in this exact format: { "meals": ["..."], "calories": 0, "protein": 0 } and no additional text.` + 
    `For proteins, use chicken breast, ground beef(97/3), or isolate whey protein powder. For Carbs, use rice, rice cakes, banannas, or pineapple. ` +
    `For Fats, use cashews or mct oil. Ensure the total calories and protein match the goal.` +
    `Make sure that the ingredients for each meal go together so its not a weird combination `

  try {
    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a precise nutrition assistant.' },
          { role: 'user', content: userPrompt }
        ]
      })
    })
    const result = await aiRes.json()
    const raw = result.choices?.[0]?.message?.content?.trim() || ''

    // Attempt direct parse, fallback to JSON substring extraction
    let plan: MealPlan
    try {
      plan = JSON.parse(raw)
    } catch {
      const match = raw.match(/\{[\s\S]*\}/)
      if (!match) {
        throw new Error('AI did not return valid JSON')
      }
      plan = JSON.parse(match[0])
    }

    return res.status(200).json({ plan })
  } catch (err: any) {
    console.error('Nutrition API error:', err)
    return res.status(500).json({ error: err.message || 'Unknown error' })
  }
}
