/** Parse GIF records by block length, never by scanning compressed image bytes. */
export function parseGIF(input) {
  const buffer = Buffer.from(input);
  if (buffer.length < 13 || !/^GIF8[79]a$/.test(buffer.toString('ascii', 0, 6))) {
    throw new Error('Invalid GIF header');
  }
  let offset = 13;
  if (buffer[10] & 128) offset += 3 * (2 ** ((buffer[10] & 7) + 1));
  const blocks = [];
  let control = null;
  function requireBytes(count) {
    if (offset + count > buffer.length) throw new Error('Truncated GIF');
  }
  function skipSubblocks() {
    while (true) {
      requireBytes(1);
      const size = buffer[offset++];
      if (!size) break;
      requireBytes(size);
      offset += size;
    }
  }
  while (offset < buffer.length) {
    const start = offset;
    const type = buffer[offset++];
    if (type === 0x3b) {
      blocks.push({type: 'trailer', offset: start, end: offset});
      break;
    }
    if (type === 0x21) {
      requireBytes(1);
      const label = buffer[offset++];
      if (label === 0xf9) {
        requireBytes(6);
        if (buffer[offset] !== 4 || buffer[offset + 5] !== 0) {
          throw new Error('Invalid GIF control extension');
        }
        control = {delay: buffer.readUInt16LE(offset + 2), delayOffset: offset + 2};
        offset += 6;
      } else {
        skipSubblocks();
      }
      blocks.push({type: 'extension', label, offset: start, end: offset});
    } else if (type === 0x2c) {
      requireBytes(9);
      const packed = buffer[offset + 8];
      offset += 9;
      if (packed & 128) offset += 3 * (2 ** ((packed & 7) + 1));
      requireBytes(1);
      offset++;
      skipSubblocks();
      blocks.push({
        type: 'frame', offset: start, end: offset,
        delay: control?.delay ?? 0, delayOffset: control?.delayOffset ?? null,
      });
      control = null;
    } else {
      throw new Error(`Invalid GIF block at ${start}`);
    }
  }
  return blocks;
}

/** Return image records and their preceding control-extension delays. */
export function listFrames(input) {
  return parseGIF(input).filter(block => block.type === 'frame');
}

/** Rewrite only the two delay bytes in each frame's control extension. */
export function rewriteDelays(input, delays) {
  const output = Buffer.from(input);
  const frames = listFrames(output);
  if (frames.length !== delays.length) throw new Error('GIF delay count must match frame count');
  frames.forEach((frame, index) => {
    if (frame.delayOffset === null) throw new Error('GIF frame has no Graphic Control Extension');
    const delay = delays[index];
    if (!Number.isInteger(delay) || delay < 0 || delay > 65535) {
      throw new Error('Invalid GIF delay');
    }
    output.writeUInt16LE(delay, frame.delayOffset);
  });
  return output;
}

/** Compatibility alias for the GIF parser. */
export const parseGif = parseGIF;
