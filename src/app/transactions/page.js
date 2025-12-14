import Navbar from "../Navbar";

export default function Transactions() {
  return (
    <div className="min-h-screen bg-black font-sans text-white">
      <Navbar />

      <main className="pt-20 flex min-h-screen w-full flex-col items-center gap-8 bg-black">
        <div className="w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <h3 className="pt-4">Transactions:</h3>

          <form
            method="post"
            action="/api/upload"
            encType="multipart/form-data"
            className="mt-4 flex items-center gap-4"
          >
            <label
              htmlFor="csvFile"
              className="cursor-pointer rounded-md bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/20"
            >
              Choose CSV
            </label>

            <input
              id="csvFile"
              name="file"
              type="file"
              accept=".csv,text/csv"
              className="hidden"
            />

            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-700"
            >
              Upload
            </button>
          </form>
        </div>

        <footer className="w-full text-center text-sm text-zinc-400">
          Manage your money simply and achieve more.
        </footer>
      </main>
    </div>
  );
}
