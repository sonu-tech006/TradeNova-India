/**
 * Indian Equity Market Session & Calendar Utility (NSE/BSE)
 * Standard Trading Session: 09:15 to 15:30 IST (Asia/Kolkata) Monday through Friday.
 */

export function getIndianMarketStatus(): {
  isOpen: boolean;
  sessionState: 'REGULAR_SESSION' | 'PRE_MARKET' | 'POST_MARKET' | 'WEEKEND' | 'HOLIDAY';
  istTimeString: string;
  nextSessionTime: string;
} {
  const now = new Date();
  // Format into Asia/Kolkata timezone
  const istFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour12: false,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const parts = istFormatter.formatToParts(now);
  const findPart = (type: string) => parts.find((p) => p.type === type)?.value || '';

  const weekday = findPart('weekday');
  const hour = parseInt(findPart('hour'), 10);
  const minute = parseInt(findPart('minute'), 10);
  const istTimeMinutes = hour * 60 + minute;

  const istTimeString = `${findPart('year')}-${findPart('month')}-${findPart('day')} ${findPart('hour')}:${findPart('minute')}:${findPart('second')} IST`;

  // Check Weekend
  if (weekday === 'Sat' || weekday === 'Sun') {
    return {
      isOpen: false,
      sessionState: 'WEEKEND',
      istTimeString,
      nextSessionTime: 'Monday 09:15 IST',
    };
  }

  // Pre-market: 09:00 to 09:15
  if (istTimeMinutes >= 540 && istTimeMinutes < 555) {
    return {
      isOpen: false,
      sessionState: 'PRE_MARKET',
      istTimeString,
      nextSessionTime: 'Today 09:15 IST (Regular Session Open)',
    };
  }

  // Regular Trading Session: 09:15 to 15:30 (555 mins to 930 mins)
  if (istTimeMinutes >= 555 && istTimeMinutes <= 930) {
    return {
      isOpen: true,
      sessionState: 'REGULAR_SESSION',
      istTimeString,
      nextSessionTime: 'Today 15:30 IST (Closing Session)',
    };
  }

  return {
    isOpen: false,
    sessionState: 'POST_MARKET',
    istTimeString,
    nextSessionTime: 'Next Trading Day 09:15 IST',
  };
}
