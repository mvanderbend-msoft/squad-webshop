import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export function Navbar() {
  const { user, logout } = useAuth();
  const { cart } = useCart();
  const navigate = useNavigate();

  const itemCount = cart.items.reduce((sum, i) => sum + i.quantity, 0);

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <nav className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="navbar-brand">
          Squad Webshop
        </Link>
        <div className="navbar-links">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            Home
          </NavLink>
          <NavLink to="/cart" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            Cart
            {itemCount > 0 && <span className="cart-badge">{itemCount}</span>}
          </NavLink>
          {user ? (
            <>
              <NavLink to="/account" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
                Account
              </NavLink>
              <button className="btn btn-ghost" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <NavLink to="/login" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              Login
            </NavLink>
          )}
        </div>
      </div>
    </nav>
  );
}
