import React from "react";

export function Button({ children, onClick, variant = "default", size = "md", disabled }) {
  const base =
    "px-4 py-2 rounded-md font-medium focus:outline-none transition-colors flex items-center justify-center";
  const variants = {
    default: "bg-blue-600 text-white hover:bg-blue-700",
    outline: "border border-blue-600 text-blue-600 hover:bg-blue-50",
    destructive: "bg-red-600 text-white hover:bg-red-700",
  };
  const sizes = {
    sm: "text-sm px-2 py-1",
    md: "text-base",
    lg: "text-lg px-6 py-3",
  };

  return (
    <button
      onClick={onClick}
      className={`${base} ${variants[variant]} ${sizes[size]}`}
      disabled={disabled}
    >
      {children}
    </button>
  );
}