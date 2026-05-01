import { useEffect, useState } from "react";
import "./App.css";
import { supabase } from "./supabaseClient";

import { Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

import { Line } from "react-chartjs-2";
import {
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement);

ChartJS.register(ArcElement, Tooltip, Legend);

type Expense = {
  id: number;
  title: string;
  amount: number;
  category: string;
};

function App() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");

  // Fetch expenses from Supabase
  const fetchExpenses = async () => {
    const { data, error } = await supabase.from("expenses").select("*");

    if (error) {
      console.log("Error fetching data:", error);
    } else {
      setExpenses(data || []);
    }
  };

  useEffect(() => {
    fetchExpenses();

    const channel = supabase
      .channel("expenses-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses" },
        () => {
          fetchExpenses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Add Expense
  const addExpense = async () => {
    if (!title || !amount) return;

    const { error } = await supabase.from("expenses").insert([
      {
        title,
        amount: Number(amount),
        category,
      },
    ]);

    if (error) {
      console.log("Error adding expense:", error);
    } else {
      setTitle("");
      setAmount("");
      setCategory("Food");
      fetchExpenses();
    }
  };
  
  const deleteExpense = async (id: number) => {
    const { error } = await supabase.from("expenses").delete().eq("id", id);

    if (error) {
      console.log("Error deleting expense:", error);
    } else {
      fetchExpenses();
    }
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0).toFixed(2);

  const categoryData = expenses.reduce((acc: any, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
    return acc;
  }, {});

  const pieData = {
    labels: Object.keys(categoryData),
    datasets: [
      {
        data: Object.values(categoryData),
        backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF"],
      },
    ],
  };

  const monthlyData = expenses.reduce((acc: any, exp: any) => {
    const date = new Date(exp.created_at);
    const month = date.toLocaleString("default", { month: "short", year: "numeric" });

    acc[month] = (acc[month] || 0) + exp.amount;
    return acc;
  }, {});

  const lineData = {
    labels: Object.keys(monthlyData),
    datasets: [
      {
        label: "Monthly Spending",
        data: Object.values(monthlyData),
        fill: true,
        borderColor: "rgb(75, 192, 85)",
        backgroundColor: "rgba(75,192,192,0.2)",
      },
    ],
  };

  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="container">
      <h1>EXPENSE TRACKER</h1>
      
      <br></br>

      <div className="chart-container">
        <div className="chart-box">
          <Line data={lineData} />
          <canvas id="barChart"></canvas>
        </div>
        <div className="chart-box">
          <Pie data={pieData} />
          <canvas id="pieChart"></canvas>
        </div>
      </div>

      <h3>Total: ${totalExpenses}</h3>

      {/* FORM ROW */}
      <div className="formRow">
        {/* Search */}
        <input
          type="text"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        {/* Title */}
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        {/* Amount */}
        <input
          type="number"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        {/* Category Dropdown */}
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="Food">Food</option>
          <option value="Transport">Transport</option>
          <option value="Shopping">Shopping</option>
          <option value="Bills">Bills</option>
          <option value="Other">Other</option>
        </select>

        {/* Button */}
        <button onClick={addExpense}>Add Expense</button>
      </div>

      {/* EXPENSE LIST */}
      <ul>
        {expenses
          .filter((exp) =>
            exp.title.toLowerCase().includes(searchTerm.toLowerCase())
          )
          .map((exp) => (
          <li className="records" key={exp.id}>
            {exp.title} | ${exp.amount} - ({exp.category})
            <button className="delete-button" onClick={() => deleteExpense(exp.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;