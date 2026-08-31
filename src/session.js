export const STREAMS = Object.freeze(['position', 'sound', 'shape', 'relation']);

export function createScoreboard() {
  return Object.fromEntries(STREAMS.map((stream) => [stream, {
    hit: 0,
    miss: 0,
    falseAlarm: 0,
    correctRejection: 0,
    lureCorrect: 0,
    lureErrors: 0,
  }]));
}

export function scoreTrial(board, truth, responses, lures = {}) {
  const verdicts = {};
  for (const stream of STREAMS) {
    const target = Boolean(truth[stream]);
    const pressed = Boolean(responses[stream]);
    let verdict;
    if (target && pressed) {
      board[stream].hit += 1;
      verdict = 'HIT';
    } else if (target && !pressed) {
      board[stream].miss += 1;
      verdict = 'MISS';
    } else if (!target && pressed) {
      board[stream].falseAlarm += 1;
      verdict = 'FALSE_ALARM';
    } else {
      board[stream].correctRejection += 1;
      verdict = 'CORRECT_REJECTION';
    }
    if (lures[stream]) {
      if (!pressed) board[stream].lureCorrect += 1;
      else board[stream].lureErrors += 1;
    }
    verdicts[stream] = verdict;
  }
  return verdicts;
}

export function summarizeScoreboard(board) {
  const streams = {};
  let correct = 0;
  let total = 0;
  for (const stream of STREAMS) {
    const stats = board[stream];
    const streamCorrect = stats.hit + stats.correctRejection;
    const streamTotal = streamCorrect + stats.miss + stats.falseAlarm;
    correct += streamCorrect;
    total += streamTotal;
    streams[stream] = {
      ...stats,
      total: streamTotal,
      accuracy: streamTotal ? Math.round((streamCorrect / streamTotal) * 1000) / 10 : 0,
      lureAccuracy: stats.lureCorrect + stats.lureErrors
        ? Math.round((stats.lureCorrect / (stats.lureCorrect + stats.lureErrors)) * 1000) / 10
        : null,
    };
  }
  return {
    ...streams,
    streams,
    combinedAccuracy: total ? Math.round((correct / total) * 1000) / 10 : 0,
    totalDecisions: total,
  };
}
