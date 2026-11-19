import { useState, useMemo, useEffect } from "react";
import { expenseCategories } from "../services/api";

const emptyExpenseForm = {
  description: "",
  amount: "",
  category: "MEALS",
  rawDate: "",
  receiptUrl: "",
};

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value || 0);
}

const itemTypeToExpenseCategory = {
  Hotel: "LODGING",
  Flight: "TRANSPORTATION",
  Transportation: "TRANSPORTATION",
  Food: "MEALS",
  Activity: "ACTIVITIES",
  Park: "ACTIVITIES",
  Shopping: "SHOPPING",
  "Saved Spot": "OTHER",
};

export default function ExpenseTracker({
  activeTrip,
  expenses,
  itineraryItems = [],
  prefilledExpense = null,
  onClearPrefilledExpense,
  onSaveExpense,
  onDeleteExpense,
  onEditTripBudget,
}) {
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [formData, setFormData] = useState({ ...emptyExpenseForm });

  // Open automatically when triggered from an itinerary card's "+ Expense" button
  useEffect(() => {
    if (!prefilledExpense) return;
    if (prefilledExpense.existingExpense) {
      const exp = prefilledExpense.existingExpense;
      setEditingExpense(exp);
      setSelectedItemId("");
      setFormData({
        description: exp.description || "",
        amount: exp.amount ?? "",
        category: exp.category || "OTHER",
        rawDate: exp.rawDate || "",
        receiptUrl: exp.receiptUrl || "",
      });
    } else {
      setEditingExpense(null);
      setSelectedItemId(prefilledExpense.itemId || "");
      setFormData({
        description: prefilledExpense.description || "",
        amount: "",
        category: prefilledExpense.category || "OTHER",
        rawDate: prefilledExpense.rawDate || activeTrip?.startDate || "",
        receiptUrl: "",
      });
    }
    setIsModalOpen(true);
    if (onClearPrefilledExpense) onClearPrefilledExpense();
  }, [prefilledExpense, activeTrip?.startDate, onClearPrefilledExpense]);

  // Calculate overall total and category subtotals
  const { totalSpent, categoryTotals } = useMemo(() => {
    const totals = {};
    for (const key of Object.keys(expenseCategories)) {
      totals[key] = 0;
    }

    let sum = 0;
    for (const exp of expenses) {
      const amt = Number(exp.amount) || 0;
      sum += amt;
      const cat = totals[exp.category] !== undefined ? exp.category : "OTHER";
      totals[cat] += amt;
    }

    return { totalSpent: sum, categoryTotals: totals };
  }, [expenses]);

  const budget = activeTrip?.budget !== null && activeTrip?.budget !== undefined
    ? Number(activeTrip.budget)
    : null;

  const remaining = budget !== null ? budget - totalSpent : null;
  const budgetPercent = budget && budget > 0 ? Math.min((totalSpent / budget) * 100, 100) : 0;
  const isOverBudget = budget !== null && totalSpent > budget;
  const isNearBudget = budget !== null && !isOverBudget && totalSpent >= budget * 0.8;

  const filteredExpenses = useMemo(() => {
    const list =
      selectedCategory === "ALL"
        ? [...expenses]
        : expenses.filter((exp) => exp.category === selectedCategory);

    const getSortKey = (exp) => {
      const matchedItem = itineraryItems.find(
        (item) =>
          item.title.trim().toLowerCase() === exp.description.trim().toLowerCase() &&
          item.rawDate === exp.rawDate
      );
      const timePart = matchedItem?.rawTime || "00:00";
      return `${exp.rawDate || ""}T${timePart}`;
    };

    return list.sort((a, b) => getSortKey(a).localeCompare(getSortKey(b)));
  }, [expenses, selectedCategory, itineraryItems]);

  function handleSelectItineraryItem(e) {
    const itemId = e.target.value;
    setSelectedItemId(itemId);
    if (!itemId) return;

    const chosen = itineraryItems.find((item) => item.id === itemId);
    if (!chosen) return;

    setFormData((prev) => ({
      ...prev,
      description: chosen.title || prev.description,
      category: itemTypeToExpenseCategory[chosen.type] || "OTHER",
      rawDate: chosen.rawDate || prev.rawDate,
    }));
  }

  function openNewModal() {
    if (!activeTrip?.id) {
      alert("Please create a trip first.");
      return;
    }
    const defaultDate =
      activeTrip.startDate || new Date().toISOString().slice(0, 10);
    setEditingExpense(null);
    setSelectedItemId("");
    setFormData({ ...emptyExpenseForm, rawDate: defaultDate });
    setIsModalOpen(true);
  }

  function openEditModal(expense) {
    setEditingExpense(expense);
    setSelectedItemId("");
    setFormData({
      description: expense.description || "",
      amount: expense.amount ?? "",
      category: expense.category || "OTHER",
      rawDate: expense.rawDate || "",
      receiptUrl: expense.receiptUrl || "",
    });
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingExpense(null);
    setSelectedItemId("");
    setFormData({ ...emptyExpenseForm });
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formData.description.trim()) {
      alert("Please enter an expense description.");
      return;
    }
    const amt = Number(formData.amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      alert("Please enter a valid amount greater than $0.");
      return;
    }
    if (!formData.rawDate) {
      alert("Please select a date for this expense.");
      return;
    }

    await onSaveExpense(
      {
        description: formData.description.trim(),
        amount: amt,
        category: formData.category,
        rawDate: formData.rawDate,
        receiptUrl: formData.receiptUrl.trim() || null,
      },
      editingExpense?.id || null
    );
    closeModal();
  }

  return (
    <section className="expense-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">TRIP BUDGET & EXPENSES</p>
          <h2>Expense Tracker</h2>
        </div>

        <button className="add-button" onClick={openNewModal}>
          + Log Expense
        </button>
      </div>

      {/* Budget Summary Card */}
      <div className="budget-summary-card">
        <div className="budget-metrics">
          <div>
            <span className="metric-label">TOTAL SPENT</span>
            <p className="metric-value">{formatCurrency(totalSpent)}</p>
          </div>

          <div>
            <span className="metric-label">OVERALL BUDGET</span>
            <p className="metric-value">
              {budget !== null ? (
                formatCurrency(budget)
              ) : (
                <button
                  type="button"
                  className="inline-link-btn"
                  onClick={onEditTripBudget}
                >
                  + Set Trip Budget
                </button>
              )}
            </p>
          </div>

          {budget !== null && (
            <div>
              <span className="metric-label">
                {isOverBudget ? "OVER BUDGET" : "REMAINING"}
              </span>
              <p
                className={`metric-value ${
                  isOverBudget ? "text-danger" : "text-success"
                }`}
              >
                {formatCurrency(Math.abs(remaining))}
              </p>
            </div>
          )}
        </div>

        {budget !== null && budget > 0 && (
          <div className="budget-progress-wrapper">
            <div className="budget-progress-bar">
              <div
                className={`budget-progress-fill ${
                  isOverBudget ? "over" : isNearBudget ? "warning" : ""
                }`}
                style={{ width: `${budgetPercent}%` }}
              />
            </div>
            <span className="budget-progress-label">
              {Math.round((totalSpent / budget) * 100)}% of budget used
            </span>
          </div>
        )}
      </div>

      {/* Category Breakdown Grid */}
      <div className="category-grid">
        {Object.entries(expenseCategories).map(([key, meta]) => {
          const catAmount = categoryTotals[key] || 0;
          const pct = totalSpent > 0 ? Math.round((catAmount / totalSpent) * 100) : 0;
          const isSelected = selectedCategory === key;

          return (
            <button
              type="button"
              key={key}
              className={`category-card ${isSelected ? "selected" : ""}`}
              onClick={() =>
                setSelectedCategory((prev) => (prev === key ? "ALL" : key))
              }
            >
              <div className="category-card-top">
                <span className="category-icon">{meta.icon}</span>
                <span className="category-pct">{pct}%</span>
              </div>
              <div className="category-name">{meta.label}</div>
              <div className="category-amount">{formatCurrency(catAmount)}</div>
            </button>
          );
        })}
      </div>

      {/* Filter Indicator */}
      {selectedCategory !== "ALL" && (
        <div className="filter-banner">
          <span>
            Showing <strong>{expenseCategories[selectedCategory]?.label}</strong>{" "}
            expenses ({filteredExpenses.length})
          </span>
          <button
            type="button"
            className="inline-link-btn"
            onClick={() => setSelectedCategory("ALL")}
          >
            Show All
          </button>
        </div>
      )}

      {/* Logged Expenses List */}
      <div className="day-items">
        {filteredExpenses.length === 0 ? (
          <p style={{ color: "#64748b" }}>
            {expenses.length === 0
              ? "No expenses logged yet for this trip."
              : "No expenses in this category."}
          </p>
        ) : (
          filteredExpenses.map((expense) => {
            const matchedItem = itineraryItems.find(
              (item) =>
                item.title.trim().toLowerCase() ===
                  expense.description.trim().toLowerCase() &&
                item.rawDate === expense.rawDate
            );

            return (
              <div className="itinerary-card" key={expense.id}>
                <div className="item-icon">{expense.icon}</div>

                <div className="item-info">
                  <span className="item-type">{expense.categoryLabel}</span>
                  <h4>{expense.description}</h4>
                  <div className="item-details">
                    <span>📅 {expense.date}</span>
                    {matchedItem?.time && <span>🕐 {matchedItem.time}</span>}
                    {expense.receiptUrl && (
                      <a
                        href={expense.receiptUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "#4f46e5", fontWeight: 600 }}
                      >
                        🔗 Receipt
                      </a>
                    )}
                  </div>
                </div>

              <div className="expense-card-right">
                <span className="expense-amount-badge">
                  {formatCurrency(expense.amount)}
                </span>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    className="cancel-button"
                    style={{ padding: "6px 12px", fontSize: "12px" }}
                    onClick={() => openEditModal(expense)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="cancel-button"
                    style={{
                      padding: "6px 12px",
                      fontSize: "12px",
                      color: "#ef4444",
                    }}
                    onClick={() => onDeleteExpense(expense.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Expense Modal */}
      {isModalOpen && (
        <div
          className="modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="modal">
            <div className="modal-header">
              <div>
                <p className="eyebrow">
                  {editingExpense ? "EDIT EXPENSE" : "NEW EXPENSE"}
                </p>
                <h2>
                  {editingExpense ? "Edit Expense" : "Log Trip Expense"}
                </h2>
              </div>
              <button className="close-button" onClick={closeModal}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit}>
                {!editingExpense && itineraryItems.length > 0 && (
                <label>
                  Link to Itinerary Item (Optional)
                  <select
                    value={selectedItemId}
                    onChange={handleSelectItineraryItem}
                  >
                    <option value="">-- Custom / General Expense --</option>
                    {itineraryItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.icon} {item.title} ({item.date})
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label>
                Description *
                <input
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Example: Marriott Hotel (2 nights)"
                />
              </label>

              <div className="form-row">
                <label>
                  Amount ($) *
                  <input
                    type="number"
                    name="amount"
                    min="0.01"
                    step="0.01"
                    value={formData.amount}
                    onChange={handleChange}
                    placeholder="0.00"
                  />
                </label>

                <label>
                  Category *
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                  >
                    {Object.entries(expenseCategories).map(([key, meta]) => (
                      <option key={key} value={key}>
                        {meta.icon} {meta.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="form-row">
                <label>
                  Date *
                  <input
                    type="date"
                    name="rawDate"
                    value={formData.rawDate}
                    onChange={handleChange}
                  />
                </label>

                <label>
                  Receipt Link (Optional)
                  <input
                    type="url"
                    name="receiptUrl"
                    value={formData.receiptUrl}
                    onChange={handleChange}
                    placeholder="https://..."
                  />
                </label>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button type="submit" className="submit-button">
                  {editingExpense ? "Save Changes" : "Add Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}