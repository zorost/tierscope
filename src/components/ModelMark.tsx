import { Link } from "react-router";
import { labInitials, labLogoSrc } from "../lib/logos";

export function ModelMark({ lab, size = 36 }: { lab: string; size?: number }) {
  return (
    <span className="model-mark" style={{ width: size, height: size }} aria-hidden="true">
      <img
        src={labLogoSrc(lab)}
        alt=""
        draggable={false}
        onError={(event) => {
          const img = event.currentTarget;
          img.style.display = "none";
          const sibling = img.nextElementSibling;
          if (sibling instanceof HTMLElement) sibling.hidden = false;
        }}
      />
      <span className="model-mark-fallback" hidden>
        {labInitials(lab)}
      </span>
    </span>
  );
}

export function NameWithMark({
  lab,
  name,
  to,
  size = 24,
}: {
  lab: string;
  name: string;
  to?: string;
  size?: number;
}) {
  const inner = (
    <>
      <ModelMark lab={lab} size={size} />
      <span className="clip">{name}</span>
    </>
  );
  if (to) {
    return (
      <Link to={to} className="name-with-mark">
        {inner}
      </Link>
    );
  }
  return <span className="name-with-mark">{inner}</span>;
}
