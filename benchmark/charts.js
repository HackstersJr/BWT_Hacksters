const { mkdir, readFile, writeFile } = require('node:fs/promises');
const { join } = require('node:path');

function buildCpuLineChartSvg(series) {
  const width = 900;
  const height = 420;
  const left = 60;
  const right = 20;
  const top = 40;
  const bottom = 60;

  if (!series.length) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><text x="20" y="40">No CPU metrics available</text></svg>`;
  }

  const values = series.map((entry) => entry.cpu);
  const maxY = Math.max(1, ...values) * 1.1;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;

  const points = series
    .map((entry, index) => {
      const x = left + (index / Math.max(1, series.length - 1)) * plotWidth;
      const y = top + (1 - entry.cpu / maxY) * plotHeight;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`,
    `<rect width="100%" height="100%" fill="#ffffff"/>`,
    `<text x="${width / 2}" y="24" text-anchor="middle" font-size="18">CPU Usage Over Time</text>`,
    `<line x1="${left}" y1="${top}" x2="${left}" y2="${height - bottom}" stroke="#222"/>`,
    `<line x1="${left}" y1="${height - bottom}" x2="${width - right}" y2="${height - bottom}" stroke="#222"/>`,
    `<polyline fill="none" stroke="#2563eb" stroke-width="2" points="${points}"/>`,
    `<text x="${width / 2}" y="${height - 16}" text-anchor="middle" font-size="12">Time samples</text>`,
    `<text x="18" y="${height / 2}" transform="rotate(-90,18,${height / 2})" text-anchor="middle" font-size="12">CPU (%)</text>`,
    `</svg>`,
  ].join('');
}

function buildTokenBarChartSvg(tokenByTask) {
  const width = 900;
  const height = 520;
  const left = 80;
  const right = 20;
  const top = 40;
  const bottom = 160;

  const entries = Object.entries(tokenByTask).sort((a, b) => b[1] - a[1]);
  if (!entries.length) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><text x="20" y="40">No token metrics available</text></svg>`;
  }

  const maxValue = Math.max(1, ...entries.map((entry) => entry[1]));
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const barGap = 12;
  const barWidth = Math.max(20, (plotWidth - barGap * (entries.length - 1)) / entries.length);

  const bars = [];
  const labels = [];
  const values = [];

  entries.forEach(([task, value], index) => {
    const x = left + index * (barWidth + barGap);
    const barHeight = (value / maxValue) * plotHeight;
    const y = top + (plotHeight - barHeight);

    bars.push(`<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${barWidth.toFixed(2)}" height="${barHeight.toFixed(2)}" fill="#16a34a"/>`);
    labels.push(`<text x="${(x + barWidth / 2).toFixed(2)}" y="${height - bottom + 20}" text-anchor="end" transform="rotate(-35 ${(x + barWidth / 2).toFixed(2)},${height - bottom + 20})" font-size="11">${task}</text>`);
    values.push(`<text x="${(x + barWidth / 2).toFixed(2)}" y="${(y - 6).toFixed(2)}" text-anchor="middle" font-size="11">${Math.round(value)}</text>`);
  });

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`,
    `<rect width="100%" height="100%" fill="#ffffff"/>`,
    `<text x="${width / 2}" y="24" text-anchor="middle" font-size="18">Token Usage Per Task</text>`,
    `<line x1="${left}" y1="${top}" x2="${left}" y2="${height - bottom}" stroke="#222"/>`,
    `<line x1="${left}" y1="${height - bottom}" x2="${width - right}" y2="${height - bottom}" stroke="#222"/>`,
    bars.join(''),
    labels.join(''),
    values.join(''),
    `<text x="${width / 2}" y="${height - 20}" text-anchor="middle" font-size="12">Task</text>`,
    `<text x="24" y="${height / 2}" transform="rotate(-90,24,${height / 2})" text-anchor="middle" font-size="12">Total Tokens</text>`,
    `</svg>`,
  ].join('');
}

async function main() {
  await mkdir(join(process.cwd(), 'charts'), { recursive: true });
  const summaryRaw = await readFile(join(process.cwd(), 'logs', 'analysis_summary.json'), 'utf-8');
  const summary = JSON.parse(summaryRaw);

  const cpuSvg = buildCpuLineChartSvg(summary.cpuSeries || []);
  const tokensSvg = buildTokenBarChartSvg(summary.tokenByTask || {});

  await writeFile(join(process.cwd(), 'charts', 'cpu_usage_over_time.svg'), cpuSvg, 'utf-8');
  await writeFile(join(process.cwd(), 'charts', 'token_usage_per_task.svg'), tokensSvg, 'utf-8');
}

main().catch((error) => {
  console.error('Chart generation failed:', error.message);
  process.exitCode = 1;
});
