import React from "react";

export function Input({ value, onChange, placeholder, type = "text", className, ...props }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`border rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400 ${className || ""}`}
      {...props}
    />
  );
}