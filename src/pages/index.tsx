// pages/index.tsx
import { useState } from 'react'
import styles from '../styles/Home.module.css'

type MealPlan = { meals: string[]; calories: number; protein: number }

export default function Home() {
  const [form, setForm] = useState({
    gender: 'male',
    age: '',
    heightFt: '',
    heightIn: '',
    weightLbs: '',
    bodyFat: '',
    goal: 'cut',
    allergies: ''
  })
  const [plan, setPlan]     = useState<MealPlan | null>(null)
  const [bmr, setBmr]       = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  // Harris-Benedict BMR calculator (inputs: lbs, inches, age)
  const calculateBMR = (
    gender: 'male' | 'female',
    weightLbs: number,
    heightIn: number,
    age: number
  ) => {
    if (gender === 'male') {
      return (66 + 6.23 * weightLbs + 12.7 * heightIn - 6.8 * age) * 1.5
    }
    return (655 + 4.35 * weightLbs + 4.7 * heightIn - 4.7 * age) * 1.5
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setPlan(null)
    setBmr(null)

    const { gender, age, heightFt, heightIn, weightLbs, bodyFat, goal, allergies } = form
    const ageN    = Number(age)
    const hFtN    = Number(heightFt)
    const hInN    = Number(heightIn)
    const wLbsN   = Number(weightLbs)
    const bfN     = Number(bodyFat)

    // Convert height to inches and cm, weight to kg
    const totalHeightIn = hFtN * 12 + hInN
    const heightCm = totalHeightIn * 2.54
    const weightKg = wLbsN * 0.453592

    // Only calculate BMR if all fields are valid numbers
    if (
      gender &&
      !isNaN(ageN) && ageN > 0 &&
      !isNaN(totalHeightIn) && totalHeightIn > 0 &&
      !isNaN(wLbsN) && wLbsN > 0
    ) {
      const myBmr = calculateBMR(gender as 'male' | 'female', wLbsN, totalHeightIn, ageN)
      setBmr(myBmr)
    } else {
      setBmr(null)
    }

    const res = await fetch('/api/nutrition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gender,
        age: ageN,
        height: heightCm,
        weight: weightKg,
        bodyFat: bfN,
        goal,
        allergies
      })
    })
    const data = await res.json()
    if (data.plan) setPlan(data.plan)
    else alert(data.error)

    setLoading(false)
  }

  return (
    <div className={styles.container}>
      <div className={styles.card} aria-busy={loading}>
        <div className={styles.title}>Macro Maker</div>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Gender:</label>
            <select
              name="gender"
              value={form.gender}
              onChange={handleChange}
              className={styles.input}
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Age:</label>
            <input
              className={styles.input}
              name="age"
              value={form.age}
              onChange={handleChange}
              placeholder="Age"
              type="number"
              min={1}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Height:</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className={styles.input}
                name="heightFt"
                value={form.heightFt}
                onChange={handleChange}
                placeholder="ft"
                type="number"
                min={0}
                required
                style={{ flex: 1 }}
              />
              <input
                className={styles.input}
                name="heightIn"
                value={form.heightIn}
                onChange={handleChange}
                placeholder="in"
                type="number"
                min={0}
                max={11}
                required
                style={{ flex: 1 }}
              />
            </div>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Weight (lbs):</label>
            <input
              className={styles.input}
              name="weightLbs"
              value={form.weightLbs}
              onChange={handleChange}
              placeholder="Weight in lbs"
              type="number"
              min={1}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Body Fat %:</label>
            <input
              className={styles.input}
              name="bodyFat"
              value={form.bodyFat}
              onChange={handleChange}
              placeholder="Body Fat %"
              type="number"
              min={0}
              max={100}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Goal:</label>
            <select
              name="goal"
              value={form.goal}
              onChange={handleChange}
              className={styles.input}
            >
              <option value="cut">Cut</option>
              <option value="maintain">Maintain</option>
              <option value="bulk">Bulk</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Allergies:</label>
            <input
              className={styles.input}
              name="allergies"
              value={form.allergies}
              onChange={handleChange}
              placeholder="Allergies (optional)"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className={styles.button}
          >
            {loading ? 'Generating...' : 'Get Meal Plan'}
          </button>
        </form>
        {bmr !== null && (
          <p style={{ marginTop: '1rem', color: 'var(--accent)', textAlign: 'center' }}>
            <strong>Maintenence:</strong> {bmr.toFixed(0)} kcal/day
          </p>
        )}
        {plan && (
          <div className={styles.result}>
            <h2>Daily Meal Plan</h2>
            <ul>
              {plan.meals.map((meal, i) => (
                <li key={i}>{meal}</li>
              ))}
            </ul>
            <p><strong>Total Calories:</strong> {plan.calories}</p>
            <p><strong>Total Protein:</strong> {plan.protein}g</p>
          </div>
        )}
      </div>
    </div>
  )
}
