import { Link } from "react-router";

export default function NotFound() {
  return (
    <div className="site-error">
      <h1>Page not found</h1>
      <p className="note">That route is not in the ranking sheet.</p>
      <p>
        <Link to="/" className="btn">
          Go to the board
        </Link>
      </p>
    </div>
  );
}
