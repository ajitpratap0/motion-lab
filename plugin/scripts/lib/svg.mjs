const colors = ['#1565c0', '#b23818', '#00796b', '#6a1b9a'];

function escape(value) {
  const entities = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;',
  };
  return String(value).replace(/[&<>"']/g, character => entities[character]);
}

function frameTicks(count, bounds, xPosition) {
  const elements = [];
  for (let frame = 0; frame < count; frame += 12) {
    const horizontal = xPosition(frame);
    elements.push(
      `<path d="M${horizontal},${bounds.top}V${bounds.bottom}" stroke="#e0e4e8"/>`,
      `<text x="${horizontal}" y="${bounds.bottom + 20}" `
        + `text-anchor="middle">${frame}</text>`,
    );
  }
  return elements.join('');
}

function valueTicks(minimum, maximum, bounds, yPosition) {
  const elements = [];
  for (let tick = 0; tick <= 4; tick++) {
    const value = minimum + (maximum - minimum) * tick / 4;
    const vertical = yPosition(value);
    elements.push(
      `<path d="M${bounds.left},${vertical}H${bounds.right}" stroke="#e0e4e8"/>`,
      `<text x="${bounds.left - 8}" y="${vertical + 4}" text-anchor="end">`
        + `${Number(value.toPrecision(4))}</text>`,
    );
  }
  return elements.join('');
}

function seriesLines(series, bounds, xPosition, yPosition) {
  return series.map((entry, index) => {
    const color = escape(entry.color ?? colors[index % colors.length]);
    const points = entry.values.map((value, frame) => (
      `${xPosition(frame).toFixed(2)},${yPosition(value).toFixed(2)}`
    )).join(' ');

    return `<polyline fill="none" stroke="${color}" stroke-width="2" points="${points}"/>`
      + `<text x="${bounds.left + index * 220}" y="25" fill="${color}">`
      + `${escape(entry.name)}</text>`;
  }).join('');
}

function annotationMarks(marks, bounds, xPosition) {
  return marks.map((mark, index) => {
    const horizontal = xPosition(mark.frame ?? mark.startFrame);
    const vertical = bounds.top + 12 + (index % 4) * 14;
    return `<path d="M${horizontal},${bounds.top}V${bounds.bottom}" `
      + 'stroke="#b71c1c" stroke-dasharray="3 4"/>'
      + `<text x="${horizontal + 3}" y="${vertical}" fill="#b71c1c">`
      + `${escape(mark.label ?? mark.type)}</text>`;
  }).join('');
}

/** Write an escaped SVG line chart with twelve-frame ticks and annotations. */
export function lineChart({
  series,
  xLabel = 'Frame',
  yLabel = 'Value',
  marks = [],
  width = 1200,
  height = 400,
}) {
  if (!series.length) {
    throw new Error('Chart requires series');
  }
  const allValues = series.flatMap(entry => entry.values);
  if (allValues.some(value => !Number.isFinite(value))) {
    throw new Error('Chart values must be finite');
  }

  const count = Math.max(...series.map(entry => entry.values.length));
  const minimum = Math.min(0, ...allValues);
  const maximum = Math.max(1, ...allValues);
  const bounds = { left: 75, right: width - 30, top: 60, bottom: height - 65 };
  const xPosition = frame => bounds.left
    + frame / Math.max(1, count - 1) * (bounds.right - bounds.left);
  const yPosition = value => bounds.bottom
    - (value - minimum) / (maximum - minimum) * (bounds.bottom - bounds.top);
  const horizontalCenter = (bounds.left + bounds.right) / 2;
  const verticalCenter = (bounds.top + bounds.bottom) / 2;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" `,
    `viewBox="0 0 ${width} ${height}">`,
    '<rect width="100%" height="100%" fill="#fafbfc"/>',
    '<g font-family="sans-serif" font-size="12" fill="#263238">',
    frameTicks(count, bounds, xPosition),
    valueTicks(minimum, maximum, bounds, yPosition),
    seriesLines(series, bounds, xPosition, yPosition),
    annotationMarks(marks, bounds, xPosition),
    `<text x="${horizontalCenter}" y="${height - 15}" text-anchor="middle">`,
    `${escape(xLabel)}</text>`,
    `<text transform="translate(17 ${verticalCenter}) rotate(-90)" `,
    `text-anchor="middle">${escape(yLabel)}</text></g></svg>`,
  ].join('');
}
