export function getFirstBookableDate() {
  const firstBookableDate = new Date();
  firstBookableDate.setHours(0, 0, 0, 0);
  firstBookableDate.setDate(firstBookableDate.getDate() + 1);
  return firstBookableDate;
}

export function isFutureDaySlotSelection(slotInfo, requiredDurationMs) {
  if (!slotInfo?.start || !slotInfo?.end) {
    return false;
  }

  return slotInfo.start >= getFirstBookableDate()
    && (slotInfo.end.getTime() - slotInfo.start.getTime()) === requiredDurationMs;
}