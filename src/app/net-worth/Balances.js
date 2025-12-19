import MoneyInput from "../moneyInput";

export default function FinancialSection({
  title,
  primaryLabel,
  primaryValue,
  onPrimaryChange,
  items,
  addItem,
  updateItem,
  removeItem,
  total,
  emptyText = "No additional items added.",
}) {
  return (
    <section className="bg-gray-900 p-6 rounded-md shadow-md w-full">
      <h2 className="text-xl font-semibold mb-4">{title}</h2>

      {/* Primary input */}
      <label className="block mb-4">
        <span className="text-sm text-gray-300">{primaryLabel}</span>

        <MoneyInput
          value={primaryValue}
          onChange={onPrimaryChange}
          placeholder="$0.00"
          className="mt-1 w-full"
        />
      </label>

      {/* Dynamic list */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-300">
            Other {title.toLowerCase()}
          </span>

          <button
            type="button"
            onClick={addItem}
            className="text-sm bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded text-white"
          >
            + Add
          </button>
        </div>

        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center"
            >
              {/* Name */}
              <input
                type="text"
                value={item.name}
                onChange={(e) => updateItem(item.id, "name", e.target.value)}
                placeholder="Name"
                className="w-full h-10 bg-black border border-gray-700 rounded-md px-3 text-white"
              />

              {/* Amount */}
              <MoneyInput
                value={item.amount}
                onChange={(val) => updateItem(item.id, "amount", val)}
                placeholder="$0.00"
                className="w-full"
              />

              {/* Remove */}
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                className="h-10 px-3 bg-red-600 hover:bg-red-700 rounded text-white whitespace-nowrap"
              >
                Remove
              </button>
            </div>
          ))}

          {items.length === 0 && (
            <p className="text-sm text-gray-400">{emptyText}</p>
          )}
        </div>
      </div>

      {/* Total */}
      <div className="mt-6 border-t border-gray-800 pt-4 flex items-center justify-between">
        <span className="text-sm text-gray-300">Total {title}</span>
        <span className="text-lg font-semibold">
          {new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
          }).format(total)}
        </span>
      </div>
    </section>
  );
}
