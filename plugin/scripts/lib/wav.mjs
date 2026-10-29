/** Encode interleaved RIFF WAVE PCM16, PCM24 or IEEE float32 samples. */
export function writeWav({ sampleRate, channels, format = 'float32' }) {
  const bits = { pcm16: 16, pcm24: 24, float32: 32 }[format];
  if (!bits || !Number.isInteger(sampleRate) || sampleRate <= 0
    || !Array.isArray(channels) || channels.length < 1 || channels.length > 2) {
    throw new Error('Invalid WAV format, sample rate or channel count');
  }
  const count = channels[0].length;
  for (const channel of channels) {
    if (channel.length !== count) throw new Error('WAV channels must have equal lengths');
    for (const value of channel) {
      if (!Number.isFinite(value)) throw new Error('WAV samples must be finite');
    }
  }
  const bytes = bits / 8;
  const size = count * channels.length * bytes;
  const headerSize = format === 'float32' ? 58 : 44;
  const buffer = Buffer.alloc(headerSize + size + (size % 2));
  buffer.write('RIFF');
  buffer.writeUInt32LE(buffer.length - 8, 4);
  buffer.write('WAVEfmt ', 8);
  buffer.writeUInt32LE(format === 'float32' ? 18 : 16, 16);
  buffer.writeUInt16LE(format === 'float32' ? 3 : 1, 20);
  buffer.writeUInt16LE(channels.length, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channels.length * bytes, 28);
  buffer.writeUInt16LE(channels.length * bytes, 32);
  buffer.writeUInt16LE(bits, 34);
  if (format === 'float32') {
    buffer.writeUInt16LE(0, 36); // WAVEFORMATEX extension size.
    buffer.write('fact', 38);
    buffer.writeUInt32LE(4, 42);
    buffer.writeUInt32LE(count, 46);
  }
  buffer.write('data', headerSize - 8);
  buffer.writeUInt32LE(size, headerSize - 4);
  let offset = headerSize;
  for (let index = 0; index < count; index++) {
    for (const channel of channels) {
      const value = Math.max(-1, Math.min(1, channel[index]));
      if (format === 'float32') {
        buffer.writeFloatLE(channel[index], offset);
      } else if (bits === 16) {
        buffer.writeInt16LE(Math.round(value * (value < 0 ? 32768 : 32767)), offset);
      } else {
        buffer.writeIntLE(Math.round(value * (value < 0 ? 8388608 : 8388607)), offset, 3);
      }
      offset += bytes;
    }
  }
  return buffer;
}

function wavChunks(buffer) {
  let format;
  let data;
  for (let offset = 12; offset + 8 <= buffer.length;) {
    const kind = buffer.toString('ascii', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    if (offset + 8 + size > buffer.length) throw new Error('Truncated WAV chunk');
    if (kind === 'fmt ') format = buffer.subarray(offset + 8, offset + 8 + size);
    if (kind === 'data') data = buffer.subarray(offset + 8, offset + 8 + size);
    offset += 8 + size + size % 2;
  }
  if (!format || format.length < 16 || !data) {
    throw new Error('WAV requires fmt and data chunks');
  }
  return { format, data };
}

function readSample(data, offset, encoding, bits) {
  if (encoding === 3) return data.readFloatLE(offset);
  if (bits === 16) return data.readInt16LE(offset) / 32768;
  return data.readIntLE(offset, 3) / 8388608;
}

/** Decode RIFF WAVE PCM16/24 or float32 mono/stereo to planar float samples. */
export function readWav(input) {
  const buffer = Buffer.from(input);
  if (buffer.length < 12 || buffer.toString('ascii', 0, 4) !== 'RIFF'
    || buffer.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error('Not a RIFF WAVE file');
  }
  const { format, data } = wavChunks(buffer);
  const encoding = format.readUInt16LE(0);
  const count = format.readUInt16LE(2);
  const sampleRate = format.readUInt32LE(4);
  const bits = format.readUInt16LE(14);
  const supportedEncoding = encoding === 1 && [16, 24].includes(bits)
    || encoding === 3 && bits === 32;
  if (![1, 2].includes(count) || !sampleRate || !supportedEncoding) {
    throw new Error('Unsupported WAV encoding (expected PCM16/24 or float32 mono/stereo)');
  }
  const bytes = bits / 8;
  if (data.length % (count * bytes)) throw new Error('Incomplete WAV sample');
  const length = data.length / (count * bytes);
  const channels = Array.from({ length: count }, () => new Float32Array(length));
  for (let index = 0; index < length; index++) {
    for (let channel = 0; channel < count; channel++) {
      const offset = (index * count + channel) * bytes;
      channels[channel][index] = readSample(data, offset, encoding, bits);
    }
  }
  return { sampleRate, channels, format: encoding === 3 ? 'float32' : `pcm${bits}` };
}
