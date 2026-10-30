/** RFC 1321 MD5. Kept off `node:crypto` so webpack can bundle it for the client. */

function toWords(bytes: Uint8Array): number[] {
  const words: number[] = [];
  for (let i = 0; i < bytes.length; i += 1) {
    words[i >> 2] |= bytes[i] << ((i % 4) * 8);
  }
  return words;
}

function leftRotate(value: number, bits: number): number {
  return (value << bits) | (value >>> (32 - bits));
}

function toHex(value: number): string {
  const hex = "0123456789abcdef";
  let output = "";
  for (let i = 0; i < 4; i += 1) {
    const byte = (value >>> (i * 8)) & 255;
    output += hex.charAt((byte >>> 4) & 15) + hex.charAt(byte & 15);
  }
  return output;
}

export function md5Hex(input: string): string {
  const encoded = new TextEncoder().encode(input);
  const bitLength = encoded.length * 8;
  const paddedLength = (((encoded.length + 8) >> 6) + 1) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(encoded);
  padded[encoded.length] = 0x80;

  const words = toWords(padded);
  words[(paddedLength >> 2) - 2] = bitLength & 0xffffffff;
  words[(paddedLength >> 2) - 1] = Math.floor(bitLength / 0x100000000);

  let a = 0x67452301;
  let b = 0xefcdab89;
  let c = 0x98badcfe;
  let d = 0x10325476;

  const s = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5,
    9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11,
    16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10,
    15, 21,
  ];
  const k = Array.from({ length: 64 }, (_, i) =>
    Math.floor(Math.abs(Math.sin(i + 1)) * 0x100000000)
  );

  for (let i = 0; i < words.length; i += 16) {
    const aa = a;
    const bb = b;
    const cc = c;
    const dd = d;

    for (let j = 0; j < 64; j += 1) {
      let f: number;
      let g: number;
      if (j < 16) {
        f = (b & c) | (~b & d);
        g = j;
      } else if (j < 32) {
        f = (d & b) | (~d & c);
        g = (5 * j + 1) % 16;
      } else if (j < 48) {
        f = b ^ c ^ d;
        g = (3 * j + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        g = (7 * j) % 16;
      }

      const temp = d;
      d = c;
      c = b;
      b =
        (b +
          leftRotate(
            (a + f + k[j]! + (words[i + g] ?? 0)) | 0,
            s[j]!
          )) |
        0;
      a = temp;
    }

    a = (a + aa) | 0;
    b = (b + bb) | 0;
    c = (c + cc) | 0;
    d = (d + dd) | 0;
  }

  return toHex(a) + toHex(b) + toHex(c) + toHex(d);
}
