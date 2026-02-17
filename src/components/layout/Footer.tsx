import packageInfo from "../../../package.json";

export default function Footer() {
  return (
    <footer className="footer-safe-area border-t border-gray-200 dark:border-gray-800 py-6 text-center text-xs text-gray-400 dark:text-gray-600 mt-auto">
      <p>Cash Flow Pilot v{packageInfo.version}</p>
    </footer>
  );
}
