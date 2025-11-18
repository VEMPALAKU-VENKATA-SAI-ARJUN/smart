import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import '../styles/Footer.css';

export default function Footer() {
  const { darkMode, toggleDarkMode } = useTheme();

  return (
    <footer className={`footer ${darkMode ? 'footer-dark' : 'footer-light'}`}>
      <div className="footer-container">
        {/* Brand & Tagline */}
        <div className="footer-brand">
          <h2 className={`footer ${darkMode ? 'footer-logo-dark' : 'footer-logo-light'}`}>S.M.A.R.T</h2>
          <p className="footer-tagline">
            An AI-Assisted Social MarketPlace for Artistic Renderings and Talents
          </p>
        </div>

        {/* Dark Mode Toggle */}
        <div className="footer-toggle">
          <button
            onClick={toggleDarkMode}
            className="dark-mode-toggle"
            aria-label="Toggle dark mode"
          >
            {darkMode ? (
              <Sun className="toggle-icon" size={20} />
            ) : (
              <Moon className="toggle-icon" size={20} />
            )}
          </button>
        </div>

        {/* Copyright & Credits */}
        <div className="footer-credits">
          <p className="footer-copyright">
            © 2025 S.M.A.R.T Platform. All rights reserved.
          </p>
          <p className="footer-author">
            Built with 💡 by <span className="author-name">Arjun Yadav</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
