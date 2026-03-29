import { useState } from "react";
import { validateVoucher } from "../api/paymentApi";

const styles = `
  .voucher-wrap {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .voucher-label {
    font-size: 0.74rem;
    letter-spacing: 0.13em;
    text-transform: uppercase;
    color: #a29789;
    font-weight: 700;
  }

  .voucher-row {
    display: flex;
    gap: 10px;
    align-items: stretch;
  }

  .voucher-input {
    flex: 1;
    padding: 13px 16px;
    border: 1.5px solid #e6ddd1;
    border-radius: 14px;
    font-size: 0.95rem;
    font-family: 'DM Sans', sans-serif;
    background: rgba(255,255,255,0.92);
    color: #241c17;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .voucher-input::placeholder {
    text-transform: none;
    letter-spacing: normal;
    color: #b7ab9c;
  }

  .voucher-input:focus {
    border-color: #c8a97e;
    box-shadow: 0 0 0 4px rgba(200, 169, 126, 0.12);
  }

  .voucher-input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .voucher-btn {
    padding: 13px 20px;
    background: #241c17;
    color: #faf8f5;
    border: none;
    border-radius: 14px;
    font-size: 0.88rem;
    font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    transition: background 0.2s, transform 0.15s;
    white-space: nowrap;
  }

  .voucher-btn:hover:not(:disabled) {
    background: #b38d5e;
    transform: translateY(-1px);
  }

  .voucher-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .voucher-feedback {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    border-radius: 12px;
    font-size: 0.88rem;
    font-weight: 500;
  }

  .voucher-feedback.success {
    background: #f0faf0;
    border: 1px solid #b8ddb8;
    color: #2d6e2d;
  }

  .voucher-feedback.error {
    background: #fff5f5;
    border: 1px solid #f5c6c6;
    color: #b83232;
  }

  .voucher-discount-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #f4ece1;
    border: 1px solid #dcc8ae;
    color: #7a5c30;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.04em;
  }

  .voucher-clear {
    background: none;
    border: none;
    color: #9e9284;
    cursor: pointer;
    font-size: 0.82rem;
    padding: 0;
    text-decoration: underline;
    font-family: 'DM Sans', sans-serif;
    transition: color 0.2s;
  }

  .voucher-clear:hover {
    color: #241c17;
  }
`;

export default function VoucherInput({ onVoucherApplied, originalAmount }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [applied, setApplied] = useState(null);
  const [error, setError] = useState("");

  const handleApply = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError("");
    setApplied(null);

    try {
      const result = await validateVoucher(code.trim().toUpperCase());

      if (result.IsValid) {
        let discountAmount = 0;

        if (result.DiscountType === "percentage") {
          discountAmount = Math.round((originalAmount * result.DiscountAmount) / 100);
        } else {
          discountAmount = result.DiscountAmount;
        }

        const finalAmount = Math.max(0, originalAmount - discountAmount);

        setApplied({
          code: code.trim().toUpperCase(),
          discountType: result.DiscountType,
          discountAmount: result.DiscountAmount,
          saving: discountAmount,
          finalAmount,
        });

        onVoucherApplied?.({
          code: code.trim().toUpperCase(),
          finalAmount,
          saving: discountAmount,
        });
      } else {
        setError(result.ErrorMessage || "Invalid voucher code");
      }
    } catch (err) {
      setError(err.message || "Could not validate voucher");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setCode("");
    setApplied(null);
    setError("");
    onVoucherApplied?.(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleApply();
  };

  return (
    <>
      <style>{styles}</style>
      <div className="voucher-wrap">
        <span className="voucher-label">Voucher Code (Optional)</span>

        {!applied ? (
          <div className="voucher-row">
            <input
              type="text"
              className="voucher-input"
              placeholder="e.g. SAVE10"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
              disabled={loading}
              maxLength={20}
            />
            <button
              className="voucher-btn"
              onClick={handleApply}
              disabled={loading || !code.trim()}
            >
              {loading ? "Checking..." : "Apply"}
            </button>
          </div>
        ) : (
          <div className="voucher-feedback success">
            <span>✓</span>
            <span>
              <strong>{applied.code}</strong> applied —{" "}
              {applied.discountType === "percentage"
                ? `${applied.discountAmount}% off`
                : `$${(applied.saving / 100).toFixed(2)} off`}
            </span>
            <button className="voucher-clear" onClick={handleClear}>
              Remove
            </button>
          </div>
        )}

        {error && (
          <div className="voucher-feedback error">
            <span>✕</span>
            <span>{error}</span>
          </div>
        )}
      </div>
    </>
  );
}
