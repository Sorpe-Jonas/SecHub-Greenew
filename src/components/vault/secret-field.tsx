"use client";

import { useState } from "react";

export function SecretField({ value }: { value: string }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="secretField">
      <input
        className="secretInput"
        readOnly
        type={visible ? "text" : "password"}
        value={value}
        aria-label="Senha da credencial"
      />
      <button
        className="secondaryButton"
        type="button"
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? "Ocultar" : "Ver"}
      </button>
    </div>
  );
}
