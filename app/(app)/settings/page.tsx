export default function SettingsPage() {
  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-8">Settings</h1>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-medium text-gray-900 mb-3">How to export LinkedIn contacts</h2>
        <ol className="text-sm text-gray-500 space-y-2 list-decimal ml-4">
          <li>Go to linkedin.com → click Me → Settings & Privacy</li>
          <li>Click Data Privacy → Get a copy of your data</li>
          <li>Select Connections → Request archive</li>
          <li>Download the Connections.csv when ready</li>
          <li>Import it here under the Import tab</li>
        </ol>
      </div>
    </div>
  )
}
