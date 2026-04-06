import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { API_GATEWAY } from "../../constants";
import { useAuth } from "../../context/AuthContext";
import apiClient from "../../services/apiClient";

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 20; // 60 seconds max

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .result-root {
    font-family: 'DM Sans', sans-serif;
    background: linear-gradient(180deg, #faf8f5 0%, #f5f1ea 100%);
    min-height: 100vh;
    color: #241c17;
  }

  /* ── Header ── */
  .result-header {
    background: linear-gradient(135deg, #1a1612 0%, #2a2320 100%);
    padding: 16px 28px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: relative;
    overflow: hidden;
  }
  .result-header::before {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, rgba(201,168,124,0.5), transparent);
  }
  .result-header-brand {
    font-family: 'Playfair Display', serif;
    font-size: 1.05rem;
    color: #faf8f5;
    font-weight: 700;
    letter-spacing: 0.02em;
  }
  .result-header-brand span { color: #c9a87c; }
  .result-header-back {
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.15);
    color: #c9a87c;
    font-size: 0.85rem;
    font-weight: 500;
    font-family: 'DM Sans', sans-serif;
    padding: 8px 18px;
    border-radius: 100px;
    cursor: pointer;
    transition: all 0.25s;
  }
  .result-header-back:hover {
    background: rgba(255,255,255,0.15);
    color: #faf8f5;
    transform: translateX(-2px);
  }

  /* ── Loading ── */
  .result-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 70vh;
    gap: 24px;
    padding: 40px;
    text-align: center;
    animation: fade-in 0.5s ease;
  }
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .result-loader-ring {
    width: 56px;
    height: 56px;
    border: 4px solid #e8e2da;
    border-top-color: #c9a87c;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    position: relative;
  }
  .result-loader-ring::before {
    content: '';
    position: absolute;
    inset: -8px;
    border-radius: 50%;
    border: 2px solid rgba(201,168,124,0.2);
    animation: spin 1.5s linear infinite reverse;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .result-loading-title {
    font-family: 'Playfair Display', serif;
    font-size: 1.5rem;
    color: #1a1612;
    font-weight: 600;
  }
  .result-loading-sub {
    font-size: 0.9rem;
    color: #7c6f5e;
    max-width: 320px;
    line-height: 1.7;
  }

  /* ── Error ── */
  .result-error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    gap: 20px;
    padding: 40px;
    text-align: center;
    animation: fade-in 0.5s ease;
  }
  .result-error-text {
    font-size: 0.95rem;
    color: #b04a2e;
    background: linear-gradient(135deg, #fff5f2, #ffe8e2);
    border: 1px solid #f5c5b8;
    border-radius: 12px;
    padding: 16px 24px;
    max-width: 380px;
    line-height: 1.6;
  }

  /* ── Content ── */
  .result-content {
    max-width: 960px;
    margin: 0 auto;
    padding: 48px 24px 100px;
    display: flex;
    flex-direction: column;
    gap: 32px;
    animation: fade-in 0.6s ease;
  }

  /* ── Section card ── */
  .result-section {
    background: #fff;
    border: 1px solid #e8e2da;
    border-radius: 20px;
    padding: 32px 36px;
    animation: fade-in 0.5s ease;
    box-shadow: 0 4px 16px rgba(0,0,0,0.04), 0 1px 4px rgba(0,0,0,0.02);
    position: relative;
    overflow: hidden;
  }
  .result-section::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #c9a87c, #e8c99a, #c9a87c);
    opacity: 0;
    transition: opacity 0.3s;
  }
  .result-section:hover::before { opacity: 1; }

  /* ── AI chip ── */
  .result-ai-chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: linear-gradient(135deg, #f5f0e8, #ede8e0);
    border: 1px solid #e2dbd2;
    padding: 7px 16px;
    border-radius: 100px;
    font-size: 0.75rem;
    color: #6b5d52;
    font-weight: 500;
    letter-spacing: 0.05em;
    margin-bottom: 20px;
  }
  .result-ai-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #c9a87c;
    animation: pulse 2s ease-in-out infinite;
    box-shadow: 0 0 6px rgba(201,168,124,0.5);
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(0.8); }
  }

  /* ── Personality profile header ── */
  .result-type-badge {
    display: inline-block;
    background: linear-gradient(135deg, #1a1612, #2a2320);
    color: #c9a87c;
    font-size: 0.72rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    font-weight: 600;
    padding: 7px 16px;
    border-radius: 100px;
    margin-bottom: 14px;
    box-shadow: 0 2px 8px rgba(26,22,18,0.2);
  }
  .result-profile-title {
    font-family: 'Playfair Display', serif;
    font-size: 2.2rem;
    font-weight: 700;
    line-height: 1.25;
    color: #1a1612;
    margin-bottom: 18px;
    background: linear-gradient(135deg, #1a1612, #4a3f35);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .result-profile-body {
    font-size: 1rem;
    line-height: 1.8;
    color: #4a3f35;
  }

  /* ── Confidence meter ── */
  .result-confidence {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-top: 24px;
    padding-top: 24px;
    border-top: 1px solid #f0ebe3;
  }
  .result-confidence-label {
    font-size: 0.75rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #8a7d6f;
    font-weight: 600;
    min-width: 120px;
  }
  .result-confidence-track {
    flex: 1;
    max-width: 200px;
    height: 8px;
    background: #e8e2da;
    border-radius: 4px;
    overflow: hidden;
    position: relative;
  }
  .result-confidence-fill {
    height: 100%;
    background: linear-gradient(90deg, #c9a87c, #e8c99a);
    border-radius: 4px;
    transition: width 1.2s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
  }
  .result-confidence-fill::after {
    content: '';
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #fff;
    border: 2px solid #c9a87c;
    box-shadow: 0 2px 6px rgba(201,168,124,0.4);
  }
  .result-confidence-fill.low {
    background: linear-gradient(90deg, #d45a4a, #e88a7a);
  }
  .result-confidence-fill.low::after {
    border-color: #d45a4a;
  }
  .result-confidence-pct {
    font-size: 0.9rem;
    color: #c9a87c;
    font-weight: 700;
    min-width: 45px;
    text-align: right;
  }
  .result-confidence-pct.low {
    color: #d45a4a;
  }

  /* ── Low-confidence notice ── */
  .result-low-confidence-notice {
    margin-top: 24px;
    padding: 18px 20px;
    background: linear-gradient(135deg, #fff8f5, #fff0eb);
    border: 1px solid #f5d5c8;
    border-radius: 12px;
    display: flex;
    align-items: flex-start;
    gap: 14px;
  }
  .result-low-confidence-icon {
    font-size: 1.2rem;
    color: #d45a4a;
    flex-shrink: 0;
    margin-top: 2px;
  }
  .result-low-confidence-text {
    font-size: 0.88rem;
    line-height: 1.7;
    color: #6b5d52;
  }

  /* ── Scores breakdown ── */
  .result-scores {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    margin-top: 24px;
    padding-top: 24px;
    border-top: 1px solid #f0ebe3;
  }
  .result-score-item {
    background: linear-gradient(135deg, #faf8f5, #f5f1ea);
    padding: 18px 20px;
    border-radius: 14px;
    border: 1px solid #e8e2da;
  }
  .result-score-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }
  .result-score-label {
    font-size: 0.82rem;
    font-weight: 600;
    color: #4a3f35;
  }
  .result-score-value {
    font-size: 0.95rem;
    font-weight: 700;
    color: #c9a87c;
    background: rgba(201,168,124,0.15);
    padding: 3px 10px;
    border-radius: 8px;
  }
  .result-score-bar-track {
    width: 100%;
    height: 8px;
    background: #e8e2da;
    border-radius: 4px;
    overflow: hidden;
    position: relative;
  }
  .result-score-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #c9a87c, #b38d5e);
    border-radius: 4px;
    transition: width 1.2s cubic-bezier(0.4, 0, 0.2, 1) 0.3s;
    position: relative;
  }
  .result-score-bar-fill::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
    animation: score-shimmer 2s ease-in-out infinite;
  }
  @keyframes score-shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  .result-score-reasoning {
    margin-top: 20px;
    padding: 18px 20px;
    background: linear-gradient(135deg, #f8f5f0, #f0ebe3);
    border-left: 3px solid #c9a87c;
    border-radius: 0 10px 10px 0;
    font-size: 0.9rem;
    line-height: 1.7;
    color: #6b5d52;
    font-style: italic;
  }

  /* ── Divider ── */
  .result-divider {
    height: 1px;
    background: linear-gradient(90deg, transparent, #e2dbd2, transparent);
  }

  /* ── Section headings ── */
  .result-section-title {
    font-family: 'Playfair Display', serif;
    font-size: 1.4rem;
    font-weight: 600;
    color: #1a1612;
    margin-bottom: 24px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .result-section-title::before {
    content: '✦';
    color: #c9a87c;
    font-size: 0.9rem;
  }

  /* ── Activity cards ── */
  .result-activity-card {
    display: flex;
    gap: 18px;
    padding: 20px 22px;
    background: linear-gradient(135deg, #faf8f5, #f5f1ea);
    border: 1px solid #e8e2da;
    border-radius: 14px;
    margin-bottom: 14px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
    cursor: pointer;
  }
  .result-activity-card::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: linear-gradient(180deg, #c9a87c, #b38d5e);
    opacity: 0;
    transition: opacity 0.3s;
  }
  .result-activity-card:hover {
    border-color: #c9a87c;
    box-shadow: 0 6px 20px rgba(201,168,124,0.15);
    transform: translateX(4px);
  }
  .result-activity-card:hover::before { opacity: 1; }
  .result-activity-card:active {
    transform: translateX(2px) scale(0.98);
  }
  .result-activity-card.added {
    background: linear-gradient(135deg, #f0f9f0, #e8f5e8);
    border-color: #8bc98b;
  }
  .result-activity-card.loading {
    opacity: 0.6;
    pointer-events: none;
  }
  .result-activity-card:last-child { margin-bottom: 0; }
  .result-activity-rank {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: linear-gradient(135deg, #c9a87c, #a8845a);
    color: #fff;
    font-size: 0.9rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 3px 10px rgba(201,168,124,0.3);
  }
  .result-activity-info { flex: 1; }
  .result-activity-name {
    font-family: 'Playfair Display', serif;
    font-size: 1.1rem;
    font-weight: 600;
    color: #1a1612;
    margin-bottom: 8px;
  }
  .result-activity-explanation {
    font-size: 0.9rem;
    line-height: 1.7;
    color: #6b5d52;
  }
  .result-activity-add-hint {
    font-size: 0.72rem;
    color: #c9a87c;
    font-weight: 600;
    letter-spacing: 0.05em;
    margin-top: 8px;
    display: flex;
    align-items: center;
    gap: 4px;
    opacity: 0;
    transition: opacity 0.3s;
  }
  .result-activity-card:hover .result-activity-add-hint {
    opacity: 1;
  }
  .result-activity-add-hint.added {
    color: #4caf50;
    opacity: 1;
  }

  /* ── Food & Drink grid ── */
  .result-food-drink-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 18px;
  }
  .result-food-drink-card {
    background: linear-gradient(135deg, #faf8f5, #f5f1ea);
    border: 1px solid #e8e2da;
    border-radius: 14px;
    padding: 22px;
    transition: all 0.3s;
  }
  .result-food-drink-card:hover {
    border-color: #c9a87c;
    box-shadow: 0 4px 16px rgba(201,168,124,0.12);
    transform: translateY(-2px);
  }
  .result-food-drink-card-title {
    font-size: 0.72rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #8a7d6f;
    font-weight: 600;
    margin-bottom: 14px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .result-food-drink-card-title::before {
    content: '✦';
    color: #c9a87c;
    font-size: 0.6rem;
  }
  .result-food-drink-item {
    margin-bottom: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid #e8e2da;
    cursor: pointer;
    transition: all 0.3s;
    border-radius: 8px;
    padding: 12px;
    margin-left: -12px;
    margin-right: -12px;
    position: relative;
  }
  .result-food-drink-item:hover {
    background: rgba(201,168,124,0.08);
  }
  .result-food-drink-item:active {
    transform: scale(0.98);
  }
  .result-food-drink-item.added {
    background: rgba(76,175,80,0.08);
    border-color: #8bc98b;
  }
  .result-food-drink-item.loading {
    opacity: 0.6;
    pointer-events: none;
  }
  .result-food-drink-item:last-child {
    margin-bottom: 0;
    padding-bottom: 0;
    border-bottom: none;
  }
  .result-food-drink-rank {
    display: inline-block;
    font-size: 0.68rem;
    font-weight: 600;
    color: #c9a87c;
    background: rgba(201,168,124,0.15);
    padding: 3px 10px;
    border-radius: 100px;
    margin-bottom: 8px;
  }
  .result-food-drink-name {
    font-family: 'Playfair Display', serif;
    font-size: 1rem;
    font-weight: 600;
    color: #1a1612;
    margin-bottom: 6px;
  }
  .result-food-drink-explanation {
    font-size: 0.85rem;
    line-height: 1.65;
    color: #6b5d52;
  }
  .result-food-drink-add-hint {
    font-size: 0.68rem;
    color: #c9a87c;
    font-weight: 600;
    margin-top: 6px;
    opacity: 0;
    transition: opacity 0.3s;
  }
  .result-food-drink-item:hover .result-food-drink-add-hint {
    opacity: 1;
  }
  .result-food-drink-add-hint.added {
    color: #4caf50;
    opacity: 1;
  }

  /* ── Closing ── */
  .result-closing {
    background: linear-gradient(135deg, #1a1612, #2a2320);
    border-radius: 16px;
    padding: 28px 32px;
    color: #faf8f5;
    font-family: 'Playfair Display', serif;
    font-size: 1.05rem;
    line-height: 1.75;
    font-style: italic;
    position: relative;
    overflow: hidden;
  }
  .result-closing::before {
    content: '"';
    position: absolute;
    top: -10px;
    left: 20px;
    font-size: 6rem;
    color: rgba(201,168,124,0.15);
    font-family: Georgia, serif;
    line-height: 1;
  }

  /* ── Action buttons ── */
  .result-actions {
    display: flex;
    gap: 14px;
    justify-content: center;
    flex-wrap: wrap;
  }
  .result-retake-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 13px 32px;
    background: transparent;
    border: 2px solid #c9a87c;
    color: #c9a87c;
    border-radius: 12px;
    font-size: 0.92rem;
    font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    letter-spacing: 0.03em;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .result-retake-btn::before {
    content: '↻';
    font-size: 1.1rem;
    transition: transform 0.3s;
  }
  .result-retake-btn:hover {
    background: #c9a87c;
    color: #fff;
    transform: translateY(-2px);
    box-shadow: 0 6px 18px rgba(201,168,124,0.3);
  }
  .result-retake-btn:hover::before {
    transform: rotate(180deg);
  }
  .result-view-past-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 13px 32px;
    background: linear-gradient(135deg, #c9a87c, #a8845a);
    border: none;
    color: #fff;
    border-radius: 12px;
    font-size: 0.92rem;
    font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    letter-spacing: 0.03em;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 4px 14px rgba(201,168,124,0.3);
  }
  .result-view-past-btn::before {
    content: '📋';
    font-size: 1rem;
  }
  .result-view-past-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(201,168,124,0.4);
  }

  /* ── Responsive ── */
  @media (max-width: 760px) {
    .result-content { padding: 32px 16px 80px; gap: 28px; }
    .result-section { padding: 24px 20px; }
    .result-profile-title { font-size: 1.7rem; }
    .result-scores { grid-template-columns: 1fr; gap: 16px; }
    .result-food-drink-grid { grid-template-columns: 1fr; }
    .result-item-card-with-image { flex-direction: column; gap: 14px; }
    .result-item-image-wrap { width: 100%; max-width: none; height: 160px; }
    .result-confidence { flex-wrap: wrap; }
    .result-actions { flex-direction: column; }
    .result-retake-btn, .result-view-past-btn { width: 100%; justify-content: center; }
    .result-cart-summary { padding: 20px; }
    .result-cart-item-row { flex-direction: column; align-items: flex-start; gap: 8px; }
    .result-cart-item-count { align-self: flex-end; }
    .result-cart-footer { flex-direction: column; gap: 12px; }
    .result-cart-proceed-btn { width: 100%; justify-content: center; }
  }

  /* ── Cart Summary Section ── */
  .result-cart-summary {
    background: #fff;
    border: 2px solid #c9a87c;
    border-radius: 16px;
    padding: 24px 28px;
    position: relative;
    overflow: hidden;
    animation: fade-in 0.5s ease;
    box-shadow: 0 4px 16px rgba(201,168,124,0.15);
  }
  .result-cart-summary::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #c9a87c, #e8c99a, #c9a87c);
  }
  .result-cart-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid #e8e2da;
  }
  .result-cart-title {
    font-family: 'Playfair Display', serif;
    font-size: 1.3rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 10px;
    color: #1a1612;
  }
  .result-cart-title::before {
    content: '🛒';
    font-size: 1.3rem;
  }
  .result-cart-count {
    background: linear-gradient(135deg, #c9a87c, #a8845a);
    color: #fff;
    font-size: 0.75rem;
    font-weight: 700;
    padding: 4px 12px;
    border-radius: 100px;
    font-family: 'DM Sans', sans-serif;
  }
  .result-cart-items-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 16px;
  }
  .result-cart-item-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: linear-gradient(135deg, #faf8f5, #f5f1ea);
    border-radius: 10px;
    border: 1px solid #e8e2da;
  }
  .result-cart-item-left {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
  }
  .result-cart-item-image {
    width: 50px;
    height: 50px;
    border-radius: 8px;
    overflow: hidden;
    flex-shrink: 0;
    background: linear-gradient(135deg, #e8e2da, #d8d2ca);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
  }
  .result-cart-item-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .result-cart-item-details { flex: 1; }
  .result-cart-item-name {
    font-size: 0.92rem;
    font-weight: 600;
    color: #1a1612;
    margin-bottom: 2px;
  }
  .result-cart-item-type {
    font-size: 0.72rem;
    color: #8a7d6f;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .result-cart-item-count {
    background: #c9a87c;
    color: #fff;
    font-size: 0.82rem;
    font-weight: 700;
    padding: 6px 14px;
    border-radius: 100px;
    white-space: nowrap;
  }
  .result-cart-item-total {
    font-size: 0.95rem;
    color: #c9a87c;
    font-weight: 700;
    white-space: nowrap;
    min-width: 55px;
    text-align: right;
  }
  .result-cart-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 16px;
    border-top: 1px solid #e8e2da;
  }
  .result-cart-total-text {
    font-size: 0.9rem;
    color: #6b5d52;
    font-weight: 600;
  }
  .result-cart-total-text span {
    color: #c9a87c;
    font-size: 1.2rem;
    font-weight: 700;
    font-family: 'Playfair Display', serif;
  }
  .result-cart-proceed-btn {
    padding: 12px 24px;
    background: linear-gradient(135deg, #c9a87c, #a8845a);
    border: none;
    border-radius: 10px;
    color: #fff;
    font-size: 0.9rem;
    font-weight: 700;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    letter-spacing: 0.03em;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 4px 14px rgba(201,168,124,0.3);
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .result-cart-proceed-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(201,168,124,0.4);
  }
  .result-cart-proceed-btn::before {
    content: '→';
    font-size: 1.1rem;
  }
  .result-cart-empty {
    text-align: center;
    padding: 20px;
    color: #8a7d6f;
  }
  .result-cart-empty-icon {
    font-size: 2rem;
    margin-bottom: 8px;
    opacity: 0.5;
  }
  .result-cart-empty-text {
    font-size: 0.85rem;
    line-height: 1.5;
  }

  /* ── Cart Remove Button ── */
  .result-cart-remove-btn {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    border: 1px solid #e8e2da;
    background: linear-gradient(135deg, #fff5f2, #ffe8e2);
    color: #d45a4a;
    font-size: 0.9rem;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    flex-shrink: 0;
  }
  .result-cart-remove-btn:hover {
    background: linear-gradient(135deg, #ffe8e2, #ffd5c8);
    border-color: #d45a4a;
    transform: scale(1.1);
    box-shadow: 0 3px 10px rgba(212,90,74,0.2);
  }
  .result-cart-remove-btn:active {
    transform: scale(0.95);
  }

  /* ── Cart Quantity Buttons ── */
  .result-cart-qty-btn {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    border: 1px solid #e8e2da;
    background: linear-gradient(135deg, #faf8f5, #f5f1ea);
    color: #6b5d52;
    font-size: 1rem;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    flex-shrink: 0;
  }
  .result-cart-qty-btn:hover {
    background: linear-gradient(135deg, #f5f1ea, #ede8e0);
    border-color: #c9a87c;
    transform: scale(1.1);
    box-shadow: 0 3px 10px rgba(201,168,124,0.2);
  }
  .result-cart-qty-btn:active {
    transform: scale(0.95);
  }

  /* ── Add to Cart Button ── */
  .result-add-to-cart-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px 20px;
    min-width: 120px;
    background: linear-gradient(135deg, #c9a87c, #a8845a);
    border: none;
    border-radius: 10px;
    color: #fff;
    font-size: 0.82rem;
    font-weight: 700;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    letter-spacing: 0.03em;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 3px 10px rgba(201,168,124,0.3);
    margin-top: 12px;
    white-space: nowrap;
    position: relative;
  }
  .result-add-to-cart-btn::before {
    content: '🛒';
    font-size: 0.9rem;
  }
  .result-add-to-cart-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(201,168,124,0.4);
  }
  .result-add-to-cart-btn:active {
    transform: translateY(0);
  }
  .result-add-to-cart-btn.added {
    background: linear-gradient(135deg, #4caf50, #45a049);
    box-shadow: 0 3px 10px rgba(76,175,80,0.3);
    min-width: 50px;
    position: relative;
    padding: 10px;
    gap: 0;
  }
  .result-add-to-cart-btn.added::before {
    content: '';
    display: none;
  }
  .result-add-to-cart-btn.added:hover {
    background: linear-gradient(135deg, #d45a4a, #c44a3a);
    box-shadow: 0 3px 10px rgba(212,90,74,0.3);
    color: transparent !important;
    transition: background 0.3s, box-shadow 0.3s;
  }
  .result-add-to-cart-btn.added:hover::after {
    content: '✕';
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
    font-weight: 700;
    color: #fff;
  }
  .result-add-to-cart-btn.loading {
    opacity: 0.6;
    pointer-events: none;
  }
  .result-add-to-cart-btn.disabled {
    background: #e8e2da;
    color: #8a7d6f;
    box-shadow: none;
    cursor: not-allowed;
    opacity: 0.7;
  }
  .result-add-to-cart-btn.disabled::before {
    content: '';
  }

  /* ── Disabled wrapper for food/drink when no activity ── */
  .result-add-disabled-wrap {
    margin-top: 12px;
    display: flex;
    justify-content: center;
  }

  .result-disabled-tooltip {
    font-size: 0.78rem;
    font-weight: 600;
    color: #8a7d6f;
    background: #f0ebe4;
    border: 1px solid #ddd5ca;
    padding: 8px 16px;
    border-radius: 10px;
    font-family: 'DM Sans', sans-serif;
    white-space: nowrap;
  }

  /* ── Item Card with Image ── */
  .result-item-card-with-image {
    display: flex;
    gap: 20px;
    padding: 20px 22px;
    background: linear-gradient(135deg, #faf8f5, #f5f1ea);
    border: 1px solid #e8e2da;
    border-radius: 14px;
    margin-bottom: 14px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
  }
  .result-item-card-with-image::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: linear-gradient(180deg, #c9a87c, #b38d5e);
    opacity: 0;
    transition: opacity 0.3s;
  }
  .result-item-card-with-image:hover {
    border-color: #c9a87c;
    box-shadow: 0 6px 20px rgba(201,168,124,0.15);
    transform: translateX(4px);
  }
  .result-item-card-with-image:hover::before { opacity: 1; }
  .result-item-card-with-image:last-child { margin-bottom: 0; }
  .result-item-card-with-image.added {
    background: linear-gradient(135deg, #f0f9f0, #e8f5e8);
    border-color: #8bc98b;
  }
  .result-item-card-with-image.loading {
    opacity: 0.6;
    pointer-events: none;
  }
  .result-item-image-wrap {
    width: 100px;
    height: 100px;
    border-radius: 12px;
    overflow: hidden;
    flex-shrink: 0;
    background: linear-gradient(135deg, #e8e2da, #d8d2ca);
  }
  .result-item-image-wrap img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .result-item-info { flex: 1; }
  .result-item-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 8px;
  }
  .result-item-name {
    font-family: 'Playfair Display', serif;
    font-size: 1.1rem;
    font-weight: 600;
    color: #1a1612;
  }
  .result-item-price {
    font-size: 0.95rem;
    color: #c9a87c;
    font-weight: 700;
    white-space: nowrap;
  }
  .result-item-rank {
    display: inline-block;
    font-size: 0.68rem;
    font-weight: 600;
    color: #c9a87c;
    background: rgba(201,168,124,0.15);
    padding: 3px 10px;
    border-radius: 100px;
    margin-bottom: 8px;
  }
  .result-item-explanation {
    font-size: 0.9rem;
    line-height: 1.7;
    color: #6b5d52;
    margin-bottom: 4px;
  }
`;

export default function ResultPage() {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confWidth, setConfWidth] = useState(0);
  const [soloWidth, setSoloWidth] = useState(0);
  const [structuredWidth, setStructuredWidth] = useState(0);
  const [cartLoading, setCartLoading] = useState({});
  const [addedItems, setAddedItems] = useState({});
  const [cartItems, setCartItems] = useState([]);
  const [activitiesData, setActivitiesData] = useState([]);
  const [menuData, setMenuData] = useState([]);
  const [bookedActivity, setBookedActivity] = useState(null);
  const clearTokenRef = useRef(0);

  useEffect(() => {
    // Check if there's already a booked activity from sessionStorage
    const existingBooking = sessionStorage.getItem("bookingActivity");
    if (existingBooking) {
      const activity = JSON.parse(existingBooking);
      setBookedActivity(activity);
      // Mark this activity as booked in addedItems so the button shows as checked
      setAddedItems((prev) => ({ ...prev, [`activity-${activity.name}`]: true }));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchCartItems = async () => {
      // Capture token at start of fetch
      const fetchToken = clearTokenRef.current;

      try {
        const res = await apiClient.get("/food-order/all");
        const allOrders = res.data.orders ?? [];
        // Show all food/drink orders (exclude booking comments)
        const foodDrinkOrders = allOrders.filter(o => !o.comment?.startsWith("booking:"));
        
        // Map API orders to local cart format
        const mappedItems = foodDrinkOrders.map(order => {
          // Determine type from comment or default to food
          const typeMatch = order.comment?.match(/\((food|drink)\)/);
          const itemType = typeMatch ? typeMatch[1] : "food";
          
          return {
            name: order.name,
            price: order.price,
            image_url: order.image_url || "",
            type: itemType,
            key: `${itemType}-${order.name}`,
            order_id: order.order_id,
            quantity: order.quantity,
          };
        });

        // If a clear happened during the fetch, discard stale results
        if (fetchToken !== clearTokenRef.current) {
          console.log("Polling result discarded — cart was cleared during fetch");
          return;
        }

        setCartItems(mappedItems);

        // Mark items as added - match by name only
        const addedMap = {};
        mappedItems.forEach(item => {
          // Mark both quiz-specific and general keys
          addedMap[item.key] = true;
          // Also mark without type prefix for broader matching
          addedMap[`food-${item.name}`] = true;
          addedMap[`drink-${item.name}`] = true;
        });

        // Preserve activity booking state across polling
        setAddedItems((prev) => {
          const next = { ...prev };
          // Keep existing activity- keys
          Object.keys(next).forEach((key) => {
            if (key.startsWith("activity-")) {
              addedMap[key] = next[key];
            }
          });
          return addedMap;
        });

        console.log("Loaded existing cart items:", mappedItems.length);
      } catch (err) {
        console.error("Failed to fetch cart items:", err);
      }
    };

    fetchCartItems();

    // Refresh cart every 5 seconds to catch changes from other pages
    const intervalId = setInterval(fetchCartItems, 5000);

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [activitiesRes, menuRes] = await Promise.all([
          fetch(`${API_GATEWAY}/activities`),
          apiClient.get("/menu"),
        ]);

        if (activitiesRes.ok) {
          const data = await activitiesRes.json();
          // API returns { activities: [...] } - extract the array
          setActivitiesData(data.activities || []);
          console.log("Fetched activities:", data.activities?.length || 0, data.activities);
        }

        if (menuRes.data) {
          // API returns { menu: [...] } - extract the array
          const menuItems = menuRes.data.menu || [];
          setMenuData(menuItems);
          console.log("Fetched menu items:", menuItems.length, menuItems);
        }
      } catch (err) {
        console.error("Failed to fetch activities or menu data:", err);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    let polls = 0;
    let intervalId;

    const fetchResult = async () => {
      // Check sessionStorage first — unauthenticated users won't have data in Supabase
      const cached = sessionStorage.getItem(`quiz_result_${submissionId}`);
      if (cached) {
        const data = JSON.parse(cached);
        const rec = data.recommendation || data;
        setResult(rec);
        setLoading(false);
        const confidence = rec.confidence_score ?? 0.6;
        const solo = rec.scores?.solo_social ?? 5;
        const structured = rec.scores?.structured_freeform ?? 5;
        setTimeout(() => {
          setConfWidth(Math.round(confidence * 100));
          setSoloWidth((solo / 10) * 100);
          setStructuredWidth((structured / 10) * 100);
        }, 200);
        return;
      }

      // sessionStorage has no data — this means either:
      // 1. User refreshed/navigated away and lost the cache
      // 2. This was an unauthenticated session (results not stored in Supabase)
      // Since unauthenticated results are never stored server-side, stop polling immediately.
      try {
        const res = await fetch(`${API_GATEWAY}/quiz/submissions/${submissionId}`);

        // Result not found — unauthenticated users never have server-side results
        if (res.status === 404) {
          clearInterval(intervalId);
          setError("This result is no longer available. Unauthenticated quiz results aren't saved — try retaking the quiz to get a fresh recommendation!");
          setLoading(false);
          return;
        }

        // Still processing — AI recommendation not ready yet
        if (res.status === 202) {
          polls++;
          if (polls >= MAX_POLLS) {
            clearInterval(intervalId);
            setError("Your profile is taking longer than expected. Please check back shortly.");
            setLoading(false);
          }
          return;
        }

        if (!res.ok) throw new Error(`Failed to fetch results (${res.status})`);

        const data = await res.json();

        // Backend returns the result directly — check for required fields
        if (!data.personality_type && !data.recommendation) {
          polls++;
          if (polls >= MAX_POLLS) {
            clearInterval(intervalId);
            setError("Your profile is taking longer than expected. Please check back shortly.");
            setLoading(false);
          }
          return;
        }

        clearInterval(intervalId);
        const rec = data.recommendation || data;
        setResult(rec);
        setLoading(false);

        // Cache for page-refresh resilience — store the wrapped format
        // consistent with what ChatWidget caches on submit
        const wrapped = data.recommendation ? data : { submission_id: submissionId, recommendation: rec };
        sessionStorage.setItem(`quiz_result_${submissionId}`, JSON.stringify(wrapped));

        // Animate bars after render
        const confidence = rec.confidence_score ?? 0.6;
        const solo = rec.scores?.solo_social ?? 5;
        const structured = rec.scores?.structured_freeform ?? 5;
        setTimeout(() => {
          setConfWidth(Math.round(confidence * 100));
          setSoloWidth((solo / 10) * 100);
          setStructuredWidth((structured / 10) * 100);
        }, 200);
      } catch (err) {
        clearInterval(intervalId);
        setError(err.message || "Something went wrong loading your results.");
        setLoading(false);
      }
    };

    fetchResult();
    intervalId = setInterval(fetchResult, POLL_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [submissionId]);

  const handleRetake = () => {
    localStorage.removeItem("quiz_user_id");
    window.dispatchEvent(new CustomEvent("retake-quiz"));
    navigate("/");
  };

  const handleAddToCart = async (itemType, itemName) => {
    if (!user) {
      console.warn("Cannot add to cart: User not logged in.");
      return;
    }

    const itemKey = `${itemType}-${itemName}`;
    setCartLoading((prev) => ({ ...prev, [itemKey]: true }));

    try {
      // Find the item in activities or menu data to get image and price
      let itemData = {};
      let menuItemId = 0;

      // Generate a unique menu_item_id for activities (use hash of name)
      if (itemType === "activity") {
        // If this activity is already booked, unbook it
        if (addedItems[itemKey]) {
          sessionStorage.removeItem("bookingActivity");
          setBookedActivity(null);
          setAddedItems((prev) => {
            const next = { ...prev };
            next[itemKey] = false;
            return next;
          });
          console.log("Activity unbooked!");
          clearTokenRef.current++;
          setCartLoading((prev) => ({ ...prev, [itemKey]: false }));
          return;
        }

        const activity = activitiesData.find(a =>
          a.name.toLowerCase().trim() === itemName.toLowerCase().trim() ||
          a.name.toLowerCase().includes(itemName.toLowerCase()) ||
          itemName.toLowerCase().includes(a.name.toLowerCase())
        );
        console.log("Looking for activity:", itemName, "Found:", activity);
        if (activity) {
          itemData = {
            id: activity.id,
            name: activity.name,
            price: activity.price,
            image: activity.image || "",
            category: activity.category || "",
            level: activity.level || "",
            duration: activity.duration || "",
            type: "activity",
          };
          console.log("Activity image URL:", activity.image);

          // If there was a previous activity, unmark it
          Object.keys(addedItems).forEach(key => {
            if (key.startsWith("activity-") && key !== itemKey) {
              setAddedItems((prev) => ({ ...prev, [key]: false }));
            }
          });

          // Store activity in sessionStorage for "Your Booking" section
          sessionStorage.setItem("bookingActivity", JSON.stringify(itemData));
          setBookedActivity(itemData);
          setAddedItems((prev) => ({ ...prev, [itemKey]: true }));
          console.log("Activity booked! Stored to sessionStorage");
        } else {
          console.warn("Activity not found in database:", itemName, "Available:", activitiesData.map(a => a.name));
        }
      } else {
        // Food/drink order - no longer requires activity booking
        const menuItem = menuData.find(m =>
          m.name.toLowerCase().trim() === itemName.toLowerCase().trim() ||
          m.name.toLowerCase().includes(itemName.toLowerCase()) ||
          itemName.toLowerCase().includes(m.name.toLowerCase())
        );
        console.log("Looking for menu item:", itemName, "Found:", menuItem);
        if (menuItem) {
          itemData = {
            name: menuItem.name,
            price: menuItem.price,
            image_url: menuItem.image_url || "",
            type: itemType,
          };
          menuItemId = menuItem.id;
          console.log("Menu item image URL:", menuItem.image_url, "Price:", menuItem.price);
          
          const payload = {
            menu_item_id: menuItemId,
            name: itemData.name,
            price: itemData.price,
            image_url: itemData.image_url,
            quantity: 1,
            comment: `Added from quiz recommendation (${itemData.type})`,
          };

          console.log("Adding to cart:", payload);
          const res = await apiClient.post("/food-order", payload);
          console.log("Cart response:", res.data);

          if (res.data && res.data.success) {
            setAddedItems((prev) => ({ ...prev, [itemKey]: true }));
            setCartItems((prev) => [...prev, { ...itemData, key: itemKey }]);
            console.log("Item added! Cart items:", cartItems.length + 1);
          } else {
            console.error("Add to cart failed: API did not return success", res.data);
          }
        } else {
          console.warn("Menu item not found in database:", itemName, "Available:", menuData.map(m => m.name));
        }
      }
    } catch (err) {
      console.error("Failed to add to cart:", err);
      console.error("Error details:", err.response?.data || err.message);
    } finally {
      setCartLoading((prev) => ({ ...prev, [itemKey]: false }));
    }
  };

  const handleRemoveFromCart = async (itemType, itemName) => {
    const itemKey = `${itemType}-${itemName}`;

    try {
      // Handle activity removal
      if (itemType === "activity") {
        sessionStorage.removeItem("bookingActivity");
        setBookedActivity(null);
        setAddedItems((prev) => {
          const next = { ...prev };
          next[itemKey] = false;
          return next;
        });
        console.log("Activity removed from cart");
        clearTokenRef.current++;
      } else {
        // Handle food/drink removal - find item by name (case-insensitive)
        const matchingItems = cartItems.filter(item => 
          item.name.toLowerCase() === itemName.toLowerCase()
        );
        if (matchingItems.length > 0) {
          const itemToRemove = matchingItems[0];
          // If we have an order_id, use it to delete
          if (itemToRemove.order_id) {
            try {
              await apiClient.delete(`/food-order/${itemToRemove.order_id}`);
              console.log("Deleted food order from API by order_id");
              setCartItems((prev) => prev.filter(item => item.order_id !== itemToRemove.order_id));
            } catch (err) {
              console.warn("Could not delete from API, removing from local state only:", err.message);
              setCartItems((prev) => prev.filter(item => item.order_id !== itemToRemove.order_id));
            }
          } else {
            // Fallback: remove from local state only
            setCartItems((prev) => prev.filter(item => item.key !== itemKey));
          }
        }

        // Check if any instances remain
        const remainingCount = cartItems.filter(item => 
          item.name.toLowerCase() === itemName.toLowerCase()
        ).length - 1;
        if (remainingCount <= 0) {
          setAddedItems((prev) => ({ ...prev, [itemKey]: false }));
        }
        console.log("Food/drink item removed from cart");
      }
    } catch (err) {
      console.error("Failed to remove from cart:", err);
    }
  };

  const handleRemoveAllFromCart = async (itemType, itemName) => {
    const itemKey = `${itemType}-${itemName}`;

    try {
      // Handle activity removal
      if (itemType === "activity") {
        sessionStorage.removeItem("bookingActivity");
        setBookedActivity(null);
        setAddedItems((prev) => {
          const next = { ...prev };
          next[itemKey] = false;
          return next;
        });
        console.log("Activity removed from cart");
        clearTokenRef.current++;
      } else {
        // Handle food/drink removal - remove ALL instances by name
        const matchingItems = cartItems.filter(item => 
          item.name.toLowerCase() === itemName.toLowerCase()
        );
        if (matchingItems.length > 0) {
          // Try to delete all from API using their order_ids
          try {
            for (const item of matchingItems) {
              if (item.order_id) {
                await apiClient.delete(`/food-order/${item.order_id}`);
              }
            }
            console.log("Deleted all food orders from API");
          } catch (err) {
            console.warn("Could not delete from API, removing from local state only:", err.message);
          }
        }

        // Remove all instances from local state
        setCartItems((prev) => prev.filter(item => 
          item.name.toLowerCase() !== itemName.toLowerCase()
        ));
        setAddedItems((prev) => ({ ...prev, [itemKey]: false }));
        console.log("All food/drink items removed from cart");
      }
    } catch (err) {
      console.error("Failed to remove from cart:", err);
    }
  };

  const handleIncrementItem = async (itemType, itemName) => {
    const itemKey = `${itemType}-${itemName}`;
    const itemData = getItemData(itemType, itemName);
    try {
      // Find existing order by name
      const existingOrder = cartItems.find(item => 
        item.name.toLowerCase() === itemName.toLowerCase()
      );
      if (existingOrder && existingOrder.order_id) {
        // Update quantity on existing order
        const newQuantity = (existingOrder.quantity || 1) + 1;
        await apiClient.put(`/food-order/${existingOrder.order_id}/quantity`, { quantity: newQuantity });
        
        // Update local state
        setCartItems((prev) => prev.map(item => 
          item.order_id === existingOrder.order_id 
            ? { ...item, quantity: newQuantity }
            : item
        ));
        console.log("Item quantity incremented via API");
      } else {
        // Create new order
        const payload = {
          menu_item_id: 0,
          name: itemData.name,
          price: itemData.price,
          image_url: itemData.image_url,
          quantity: 1,
          comment: `Added from quiz recommendation (${itemType})`,
        };

        const res = await apiClient.post("/food-order", payload);
        if (res.data && res.data.success) {
          setCartItems((prev) => [...prev, { ...itemData, key: itemKey, type: itemType, quantity: 1 }]);
          console.log("Item quantity incremented");
        }
      }
    } catch (err) {
      console.error("Failed to increment item:", err);
    }
  };

  const handleDecrementItem = async (itemType, itemName) => {
    const itemKey = `${itemType}-${itemName}`;
    try {
      const existingOrder = cartItems.find(item => 
        item.name.toLowerCase() === itemName.toLowerCase()
      );
      if (existingOrder && existingOrder.order_id) {
        const currentQty = existingOrder.quantity || 1;
        if (currentQty <= 1) {
          // Delete the order
          await apiClient.delete(`/food-order/${existingOrder.order_id}`);
          setCartItems((prev) => prev.filter(item => item.order_id !== existingOrder.order_id));
        } else {
          // Decrease quantity
          const newQuantity = currentQty - 1;
          await apiClient.put(`/food-order/${existingOrder.order_id}/quantity`, { quantity: newQuantity });
          setCartItems((prev) => prev.map(item => 
            item.order_id === existingOrder.order_id 
              ? { ...item, quantity: newQuantity }
              : item
          ));
        }
        console.log("Item quantity decremented via API");
      } else {
        // Fallback: remove from local state
        setCartItems((prev) => prev.filter(item => 
          item.name.toLowerCase() !== itemName.toLowerCase()
        ));
      }

      const remainingCount = cartItems.filter(item => 
        item.name.toLowerCase() === itemName.toLowerCase()
      ).length;
      if (remainingCount <= 0) {
        setAddedItems((prev) => ({ ...prev, [itemKey]: false }));
      }
    } catch (err) {
      console.error("Failed to decrement item:", err);
    }
  };

  const handleAddMultipleToCart = async (items) => {
    setCartLoading({});
    
    try {
      for (const item of items) {
        await apiClient.post("/food-order", {
          name: item.name,
          price: 0,
          image_url: "",
          quantity: 1,
          comment: `Added from quiz recommendation (${item.type})`,
        });
      }
      
      navigate("/cart");
    } catch (err) {
      console.error("Failed to add items to cart:", err);
    }
  };

  const getItemData = (itemType, itemName) => {
    if (itemType === "activity") {
      const activity = activitiesData.find(a => 
        a.name.toLowerCase() === itemName.toLowerCase() ||
        a.name.toLowerCase().includes(itemName.toLowerCase()) ||
        itemName.toLowerCase().includes(a.name.toLowerCase())
      );
      return activity ? {
        name: activity.name,
        price: activity.price,
        image_url: activity.image || "",
      } : { name: itemName, price: 0, image_url: "" };
    } else {
      // For food and drinks, try multiple matching strategies
      const menuItem = menuData.find(m => {
        const menuName = m.name.toLowerCase();
        const recName = itemName.toLowerCase();
        return menuName === recName ||
               menuName.includes(recName) ||
               recName.includes(menuName) ||
               // Handle common variations
               menuName.replace(/\s+/g, ' ') === recName.replace(/\s+/g, ' ') ||
               menuName.replace(/[-_]/g, ' ') === recName.replace(/[-_]/g, ' ');
      });
      return menuItem ? {
        name: menuItem.name,
        price: menuItem.price,
        image_url: menuItem.image_url || "",
      } : { name: itemName, price: 0, image_url: "" };
    }
  };

  const isLowConfidence = result && (result.confidence_score || 0) < 0.5;

  return (
    <>
      <style>{styles}</style>
      <div className="result-root">
        <div className="result-header">
          <span className="result-header-brand">Café de <span>Paris</span></span>
          <button className="result-header-back" onClick={() => navigate(-1)}>← Back</button>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="result-loading">
            <div className="result-loader-ring" />
            <p className="result-loading-title">Crafting your profile…</p>
            <p className="result-loading-sub">
              Our AI is analysing your answers and finding the perfect activities, food, and drinks for you.
              This usually takes about 15–30 seconds.
            </p>
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="result-error">
            <p className="result-error-text">{error}</p>
            <button className="result-retake-btn" onClick={handleRetake}>
              Try Again
            </button>
          </div>
        )}

        {/* Result */}
        {!loading && result && (
          <div className="result-content">

            {/* ── Personality Profile ── */}
            <div className="result-section">
              <div className="result-ai-chip">
                <span className="result-ai-dot" />
                Your AI-Generated Personality Profile
              </div>

              <div className="result-type-badge">{result.personality_type}</div>
              <h1 className="result-profile-title">{result.profile_title}</h1>
              <p className="result-profile-body">{result.profile_body}</p>

              {/* Confidence meter */}
              {result.confidence_score !== undefined && result.confidence_score !== null && (
                <div className="result-confidence">
                  <span className="result-confidence-label">Match confidence</span>
                  <div className="result-confidence-track">
                    <div
                      className={`result-confidence-fill${isLowConfidence ? " low" : ""}`}
                      style={{ width: `${confWidth}%` }}
                    />
                  </div>
                  <span className={`result-confidence-pct${isLowConfidence ? " low" : ""}`}>
                    {confWidth}%
                  </span>
                </div>
              )}

              {/* Scoring breakdown */}
              {result.scores && (
                <div className="result-scores">
                  <div className="result-score-item">
                    <div className="result-score-header">
                      <span className="result-score-label">Solo ← → Social</span>
                      <span className="result-score-value">{result.scores.solo_social}/10</span>
                    </div>
                    <div className="result-score-bar-track">
                      <div className="result-score-bar-fill" style={{ width: `${soloWidth}%` }} />
                    </div>
                  </div>
                  <div className="result-score-item">
                    <div className="result-score-header">
                      <span className="result-score-label">Structured ← → Freeform</span>
                      <span className="result-score-value">{result.scores.structured_freeform}/10</span>
                    </div>
                    <div className="result-score-bar-track">
                      <div className="result-score-bar-fill" style={{ width: `${structuredWidth}%` }} />
                    </div>
                  </div>
                </div>
              )}

              {/* Low-confidence notice */}
              {isLowConfidence && (
                <div className="result-low-confidence-notice">
                  <span className="result-low-confidence-icon">✦</span>
                  <p className="result-low-confidence-text">
                    Your answers were too brief for us to place you into a creative profile or confidently recommend activities, food, or drinks.
                    Try retaking the quiz with a bit more detail — even a sentence or two per answer helps a lot.
                  </p>
                </div>
              )}
            </div>

            {/* ── Activity Recommendations ── */}
            {!isLowConfidence && result.activity_explanations && result.activity_explanations.length > 0 && (
              <div className="result-section">
                <h2 className="result-section-title">Your Recommended Activities</h2>
                {result.activity_explanations
                  .sort((a, b) => a.rank - b.rank)
                  .map((item) => {
                    const itemKey = `activity-${item.activity}`;
                    const isAdded = addedItems[itemKey];
                    const isLoading = cartLoading[itemKey];
                    const itemData = getItemData("activity", item.activity);
                    const isOtherActivityBooked = bookedActivity && bookedActivity.name !== item.activity;
                    const notLoggedIn = !user;

                    return (
                      <div
                        key={item.rank}
                        className={`result-item-card-with-image${isAdded ? " added" : ""}${isLoading ? " loading" : ""}`}
                      >
                        <div className="result-item-image-wrap">
                          {itemData.image_url ? (
                            <img src={itemData.image_url} alt={item.activity} />
                          ) : (
                            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#8a7d6f", fontSize: "2rem" }}>🎨</div>
                          )}
                        </div>
                        <div className="result-item-info">
                          <div className="result-item-header">
                            <div>
                              <span className="result-item-rank">#{item.rank}</span>
                              <div className="result-item-name">{item.activity}</div>
                            </div>
                            <div className="result-item-price">${itemData.price}</div>
                          </div>
                          <div className="result-item-explanation">{item.explanation}</div>
                          <button
                            className={`result-add-to-cart-btn${isAdded ? " added" : ""}${isOtherActivityBooked || notLoggedIn ? " disabled" : ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!notLoggedIn && !isOtherActivityBooked) {
                                if (isAdded) {
                                  // Remove the booking
                                  handleRemoveFromCart("activity", item.activity);
                                } else {
                                  // Navigate to booking page with this activity
                                  const activity = activitiesData.find(a =>
                                    a.name.toLowerCase().trim() === item.activity.toLowerCase().trim() ||
                                    a.name.toLowerCase().includes(item.activity.toLowerCase()) ||
                                    item.activity.toLowerCase().includes(a.name.toLowerCase())
                                  );
                                  if (activity) {
                                    navigate("/booking", { state: { activity } });
                                  }
                                }
                              }
                            }}
                            disabled={notLoggedIn}
                          >
                            {isAdded ? "✓" : notLoggedIn ? "🔒 Login Required" : isOtherActivityBooked ? "🔒 Locked" : "Choose Time Slot"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            {/* ── Food & Drink Recommendations ── */}
            {!isLowConfidence && (result.food_recommendation_details?.length > 0 || result.drink_recommendation_details) && (
              <div className="result-section">
                <h2 className="result-section-title">Your Food & Drink Picks</h2>
                <div className="result-food-drink-grid">
                  {result.food_recommendation_details && result.food_recommendation_details.length > 0 && (
                    <div className="result-food-drink-card">
                      <div className="result-food-drink-card-title">✦ Food Recommendations</div>
                      {result.food_recommendation_details
                        .sort((a, b) => a.rank - b.rank)
                        .map((item) => {
                          const itemKey = `food-${item.food}`;
                          const isInCart = cartItems.some(ci => ci.name.toLowerCase() === item.food.toLowerCase());
                          const isAdded = addedItems[itemKey] || isInCart;
                          const isLoading = cartLoading[itemKey];
                          const itemData = getItemData("food", item.food);
                          const notLoggedIn = !user;

                          return (
                            <div
                              key={item.rank}
                              className={`result-item-card-with-image${isAdded ? " added" : ""}${isLoading ? " loading" : ""}`}
                              style={{ marginBottom: "12px" }}
                            >
                              <div className="result-item-image-wrap">
                                {itemData.image_url ? (
                                  <img src={itemData.image_url} alt={item.food} />
                                ) : (
                                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#8a7d6f", fontSize: "2rem" }}>🍽️</div>
                                )}
                              </div>
                              <div className="result-item-info">
                                <div className="result-item-header">
                                  <div>
                                    <span className="result-item-rank">#{item.rank} Pick</span>
                                    <div className="result-item-name">{item.food}</div>
                                  </div>
                                  <div className="result-item-price">${itemData.price}</div>
                                </div>
                                <div className="result-item-explanation">{item.explanation}</div>
                                <button
                                  className={`result-add-to-cart-btn${isAdded ? " added" : ""}${isLoading ? " loading" : ""}${notLoggedIn ? " disabled" : ""}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!isLoading && !notLoggedIn) {
                                      if (isAdded) {
                                        handleRemoveFromCart("food", item.food);
                                      } else {
                                        handleAddToCart("food", item.food);
                                      }
                                    }
                                  }}
                                  disabled={isLoading || notLoggedIn}
                                >
                                  {isAdded ? "✓" : notLoggedIn ? "🔒 Login Required" : isLoading ? "..." : "Add to Cart"}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}

                  {result.drink_recommendation_details && (
                    <div className="result-food-drink-card">
                      <div className="result-food-drink-card-title">✦ Drink Recommendation</div>
                      {(() => {
                        const drinkName = result.drink_recommendation_details.drink || result.drink_recommendation;
                        const itemKey = `drink-${drinkName}`;
                        const isInCart = cartItems.some(ci => ci.name.toLowerCase() === drinkName.toLowerCase());
                        const isAdded = addedItems[itemKey] || isInCart;
                        const isLoading = cartLoading[itemKey];
                        const itemData = getItemData("drink", drinkName);
                        const notLoggedIn = !user;

                        return (
                          <div
                            className={`result-item-card-with-image${isAdded ? " added" : ""}${isLoading ? " loading" : ""}`}
                            style={{ marginBottom: "12px" }}
                          >
                            <div className="result-item-image-wrap">
                              {itemData.image_url ? (
                                <img src={itemData.image_url} alt={drinkName} />
                              ) : (
                                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#8a7d6f", fontSize: "2rem" }}>🥤</div>
                              )}
                            </div>
                            <div className="result-item-info">
                              <div className="result-item-header">
                                <div>
                                  <span className="result-item-rank">Perfect Pairing</span>
                                  <div className="result-item-name">{drinkName}</div>
                                </div>
                                <div className="result-item-price">${itemData.price}</div>
                              </div>
                              <div className="result-item-explanation">
                                {result.drink_recommendation_details.explanation}
                              </div>
                              <button
                                className={`result-add-to-cart-btn${isAdded ? " added" : ""}${isLoading ? " loading" : ""}${notLoggedIn ? " disabled" : ""}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!isLoading && !notLoggedIn) {
                                    if (isAdded) {
                                      handleRemoveFromCart("drink", drinkName);
                                    } else {
                                      handleAddToCart("drink", drinkName);
                                    }
                                  }
                                }}
                                disabled={isLoading || notLoggedIn}
                              >
                                {isAdded ? "✓" : notLoggedIn ? "🔒 Login Required" : isLoading ? "..." : "Add to Cart"}
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Closing ── */}
            {result.closing && (
              <div className="result-closing">{result.closing}</div>
            )}

            {/* ── Cart Summary ── */}
            <div className="result-cart-summary">
              <div className="result-cart-header">
                <div className="result-cart-title">
                  Your Cart
                  {(cartItems.length > 0 || bookedActivity) && (
                    <span className="result-cart-count">
                      {bookedActivity ? "1" : ""}{cartItems.length > 0 && bookedActivity ? " + " : ""}{cartItems.length > 0 ? `${cartItems.length} item${cartItems.length !== 1 ? "s" : ""}` : ""}
                    </span>
                  )}
                </div>
              </div>
              
              {bookedActivity || cartItems.length > 0 ? (
                <>
                  <div className="result-cart-items-list">
                    {bookedActivity && (
                      <div className="result-cart-item-row">
                        <div className="result-cart-item-left">
                          <div className="result-cart-item-image">
                            {bookedActivity.image || bookedActivity.image_url ? (
                              <img src={bookedActivity.image || bookedActivity.image_url} alt={bookedActivity.name} />
                            ) : (
                              <span>🎨</span>
                            )}
                          </div>
                          <div className="result-cart-item-details">
                            <div className="result-cart-item-name">{bookedActivity.name}</div>
                            <div className="result-cart-item-type">Activity Booking</div>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div className="result-cart-item-total">
                            ${bookedActivity.price}
                          </div>
                          <button
                            className="result-cart-remove-btn"
                            onClick={() => handleRemoveFromCart("activity", bookedActivity.name)}
                            title="Remove from cart"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    )}
                    {cartItems.length > 0 && (() => {
                      // Group items by name and sum their quantities
                      const itemCounts = {};
                      cartItems.forEach(item => {
                        const normalizedName = item.name.toLowerCase();
                        if (!itemCounts[normalizedName]) {
                          itemCounts[normalizedName] = { ...item, count: 0, keys: [] };
                        }
                        itemCounts[normalizedName].count += (item.quantity || 1);
                        itemCounts[normalizedName].keys.push(item.key);
                      });

                      return Object.values(itemCounts).map((item, index) => (
                        <div key={`${item.name}-${index}`} className="result-cart-item-row">
                          <div className="result-cart-item-left">
                            <div className="result-cart-item-image">
                              {item.image_url ? (
                                <img src={item.image_url} alt={item.name} />
                              ) : (
                                <span>{item.type === "food" ? "🍽️" : "🥤"}</span>
                              )}
                            </div>
                            <div className="result-cart-item-details">
                              <div className="result-cart-item-name">{item.name}</div>
                              <div className="result-cart-item-type">{item.type}</div>
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <button
                              className="result-cart-qty-btn"
                              onClick={() => handleDecrementItem(item.type, item.name)}
                              title="Decrease quantity"
                            >
                              −
                            </button>
                            <div className="result-cart-item-count">
                              × {item.count}
                            </div>
                            <button
                              className="result-cart-qty-btn"
                              onClick={() => handleIncrementItem(item.type, item.name)}
                              title="Increase quantity"
                            >
                              +
                            </button>
                            <div className="result-cart-item-total">
                              ${(item.price * item.count).toFixed(2)}
                            </div>
                            <button
                              className="result-cart-remove-btn"
                              onClick={() => handleRemoveAllFromCart(item.type, item.name)}
                              title="Remove all from cart"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                  <div className="result-cart-footer">
                    <div className="result-cart-total-text">
                      Total: <span>${((bookedActivity?.price || 0) + cartItems.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0)).toFixed(2)}</span>
                    </div>
                    <button 
                      className="result-cart-proceed-btn"
                      onClick={() => navigate("/cart", { state: { bookingActivity: bookedActivity } })}
                    >
                      View Cart
                    </button>
                  </div>
                </>
              ) : (
                <div className="result-cart-empty">
                  <div className="result-cart-empty-icon">🛒</div>
                  <div className="result-cart-empty-text">
                    Book an activity or add food/drinks to your cart
                  </div>
                </div>
              )}
            </div>

            {/* ── Actions ── */}
            <div className="result-actions">
              <button className="result-retake-btn" onClick={handleRetake}>
                Retake the Quiz
              </button>
              {user && (
                <button className="result-view-past-btn" onClick={() => navigate("/my-recommendations")}>
                  View Past Recommendations
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
