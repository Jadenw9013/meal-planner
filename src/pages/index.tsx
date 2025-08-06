import { useState } from 'react'
import styles from '../styles/Home.module.css'

type MealPlan = { meals: string[]; calories: number; protein: number }

export default function Home() {
  const [form, setForm] = useState({ age: '', height: '', weight: '', bodyFat: '', goal: '', allergies: '' });
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setPlan(null);
    try {
      const res = await fetch('/api/nutrition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          age: Number(form.age),
          height: Number(form.height),
          weight: Number(form.weight),
          bodyFat: Number(form.bodyFat),
          goal: form.goal,
          allergies: form.allergies
        })
      });
      const data = await res.json();
      if (data.plan) setPlan(data.plan);
      else alert(data.error);
    } catch (err) {
      console.error(err);
      alert('Failed to fetch meal plan');
    }
    setLoading(false);
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.title}>Diet Planner</div>
        <form onSubmit={handleSubmit} className={styles.form}>
          {['age','height','weight','bodyFat','goal','allergies'].map((name: string) => (
            <div key={name} className={styles.inputGroup}>
              <label className={styles.label}>
                {name.charAt(0).toUpperCase() + name.slice(1)}:
              </label>
              <input
                name={name}
                value={(form as any)[name]}
                onChange={handleChange}
                placeholder={name}
                className={styles.input}
                required={name !== 'allergies'}
              />
            </div>
          ))}
          <button type="submit" disabled={loading} className={styles.button}>
            {loading ? 'Generating...' : 'Get Meal Plan'}
          </button>
        </form>

        {plan && (
          <div className={styles.mealPlan}>
            <h2>Daily Meal Plan</h2>
            <ul>
              {plan.meals.map((meal: string, i: number) => (
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
