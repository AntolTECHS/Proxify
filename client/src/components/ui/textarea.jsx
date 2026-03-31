import React from "react";

export function Textarea({ value, onChange, placeholder, className, rows = 4, ...props }) {
  return (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      className={`border rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400 ${className || ""}`}
      {...props}
    />
  );
}