import { useEffect, cloneElement } from "react";

/**
 * SHEET ROOT
 */
export function Sheet({ open, onOpenChange, children }) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);

  // Split children into Trigger and Content
  let trigger = null;
  let content = null;

  const items = Array.isArray(children) ? children : [children];

  items.forEach((child) => {
    if (!child) return;

    if (child.type?.name === "SheetTrigger") {
      trigger = cloneElement(child, { onOpenChange });
    }

    if (child.type?.name === "SheetContent") {
      content = child;
    }
  });

  return (
    <>
      {/* Always render trigger */}
      {trigger}

      {/* Only render overlay + content when open */}
      {open && (
        <div className="fixed inset-0 z-50">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => onOpenChange(false)}
          />

          {/* Content */}
          {cloneElement(content, { onOpenChange })}
        </div>
      )}
    </>
  );
}

/**
 * SHEET CONTENT
 */
export function SheetContent({
  side = "left",
  children,
  className = "",
}) {
  return (
    <div
      className={`
        fixed top-0 ${side === "left" ? "left-0" : "right-0"}
        h-full w-[85vw] max-w-sm
        bg-white shadow-xl z-50
        transform transition-transform duration-300
        ${side === "left" ? "translate-x-0" : "translate-x-0"}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

/**
 * SHEET TRIGGER
 */
export function SheetTrigger({ children, onOpenChange }) {
  return cloneElement(children, {
    onClick: (e) => {
      children.props.onClick?.(e); // preserve existing click
      onOpenChange(true);
    },
  });
}