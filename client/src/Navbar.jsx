import React from 'react';
import { Link, useLocation } from 'react-router-dom';

// Animated Bug Component for navbar
const NavbarBug = () => (
  <div className="navbar-bug">
    <svg width="32" height="32" viewBox="0 0 120 120" className="navbar-bug-svg">
      {/* Bug body - orange primary */}
      <ellipse cx="60" cy="65" rx="22" ry="30" fill="#f97316" />
      
      {/* Bug head - lighter orange */}
      <circle cx="60" cy="35" r="16" fill="#fb923c" />
      
      {/* Antennae - blue accents */}
      <line x1="52" y1="22" x2="48" y2="12" stroke="#0b61ff" strokeWidth="3" strokeLinecap="round" />
      <line x1="68" y1="22" x2="72" y2="12" stroke="#0b61ff" strokeWidth="3" strokeLinecap="round" />
      <circle cx="48" cy="12" r="3" fill="#0b61ff" />
      <circle cx="72" cy="12" r="3" fill="#0b61ff" />
      
      {/* Eyes */}
      <circle cx="54" cy="32" r="3" fill="white" />
      <circle cx="66" cy="32" r="3" fill="white" />
      <circle cx="54" cy="32" r="1.5" fill="black" />
      <circle cx="66" cy="32" r="1.5" fill="black" />
      
      {/* Wings - orange/blue mix */}
      <ellipse cx="40" cy="50" rx="10" ry="18" fill="#fb923c" opacity="0.8" transform="rotate(-15 40 50)" />
      <ellipse cx="80" cy="50" rx="10" ry="18" fill="#fb923c" opacity="0.8" transform="rotate(15 80 50)" />
      
      {/* Wing patterns - blue */}
      <ellipse cx="40" cy="47" rx="4" ry="8" fill="#0b61ff" opacity="0.9" transform="rotate(-15 40 47)" />
      <ellipse cx="80" cy="47" rx="4" ry="8" fill="#0b61ff" opacity="0.9" transform="rotate(15 80 47)" />
      
      {/* Legs - darker orange */}
      <line x1="45" y1="75" x2="35" y2="85" stroke="#ea580c" strokeWidth="3" strokeLinecap="round" />
      <line x1="45" y1="85" x2="35" y2="95" stroke="#ea580c" strokeWidth="3" strokeLinecap="round" />
      <line x1="75" y1="75" x2="85" y2="85" stroke="#ea580c" strokeWidth="3" strokeLinecap="round" />
      <line x1="75" y1="85" x2="85" y2="95" stroke="#ea580c" strokeWidth="3" strokeLinecap="round" />
      
      {/* Smile - blue */}
      <path d="M 54 36 Q 60 42 66 36" stroke="#0b61ff" strokeWidth="2" fill="none" strokeLinecap="round" />
      
      {/* Body spots - blue */}
      <circle cx="55" cy="58" r="2.5" fill="#0b61ff" opacity="0.8" />
      <circle cx="65" cy="68" r="2" fill="#0b61ff" opacity="0.8" />
      <circle cx="58" cy="78" r="2" fill="#0b61ff" opacity="0.8" />
    </svg>
  </div>
);

export default function Navbar({ isLoggedIn, userFirstName, userRole, onLogout }) {
  const location = useLocation(); // Now this is inside Router context

  return (
    <header className="navbar blue-navbar">
      <div className="brand">
        <NavbarBug />
        <span className="brand-text">
          BugHouse {userFirstName ? `· Hi, ${userFirstName}` : ''}
        </span>
      </div>

      <nav className="nav-links">
        {isLoggedIn ? (
          <>
            <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
              Dashboard
            </Link>
            
            {/* Only show Sessions and Book for Students and Tutors */}
            {(userRole === 'Student' || userRole === 'Tutor') && (
              <>
                <Link to="/sessions" className={location.pathname === '/sessions' ? 'active' : ''}>
                  My Sessions
                </Link>
              </>
            )}
            
            {/* Only show Book for Students */}
            {userRole === 'Student' && (
              <Link to="/book" className={location.pathname === '/book' ? 'active' : ''}>
                Book
              </Link>
            )}
            
            {/* Only show Tutor-specific links for Tutors */}
            {userRole === 'Tutor' && (
              <>
                <Link to="/availability" className={location.pathname === '/availability' ? 'active' : ''}>
                  My Availability
                </Link>
                <Link to="/profile" className={location.pathname === '/profile' ? 'active' : ''}>
                  Profile
                </Link>
              </>
            )}
            
            {/* Only show Admin link for Admins */}
            {userRole === 'Admin' && (
              <>
              <Link to="/admin" className={location.pathname === '/admin' ? 'active' : ''}>
                Admin
              </Link>
              <Link
                  to="/admin/users"
                  className={location.pathname === '/admin/users' || location.pathname.startsWith('/admin/users') ? 'active' : ''}
                >
                  Manage Users
                </Link>
              </>
            )}
            
            <button className="btn ghost logout" onClick={onLogout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Log in</Link>
            <Link to="/signup" className="active">Sign up</Link>
          </>
        )}
      </nav>
    </header>
  );
}