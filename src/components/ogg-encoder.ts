import * as crc32 from "cyclic-32";
import { Writable } from "stream";

export class OggEncoder {
  // Flags for all ogg
  public static BOS = 2;
  public static EOS = 4;

  constructor(private fstream: Writable) {}
  write(
    granulePos: number,
    streamNo: number,
    packetNo: number,
    chunk: Buffer,
    flags?: number
  ) {
    // How many bytes will be required to explain this chunk?
    const lengthBytes = Math.ceil(chunk.length / 255) + 1;

    // The total header length
    const headerBytes = 26 + lengthBytes;
    const header = Buffer.alloc(headerBytes + chunk.length);

    // Byte 0: Initial header
    header.write("OggS");

    // Byte 4: Stream structure 0

    // Byte 5: Flags
    if (typeof flags === "undefined") flags = 0;
    header.writeUInt8(flags, 5);

    // Byte 6: Granule pos
    header.writeUIntLE(granulePos, 6, 6);

    // Byte 14: Stream number
    header.writeUInt32LE(streamNo, 14);

    // Byte 18: Sequence number
    header.writeUInt32LE(packetNo, 18);

    // Byte 22: CRC-32, filled in later

    // Byte 26: Number of segments
    header.writeUInt8(lengthBytes - 1, 26);

    // And the segment lengths themselves
    let i = 27;
    if (chunk.length) {
      let r = chunk.length;
      while (r > 255) {
        header.writeUInt8(255, i++);
        r -= 255;
      }
      header.writeUInt8(r, i);
    }

    // Then of course the actual data
    chunk.copy(header, headerBytes);
    chunk = header;

    // Now that it's together we can figure out the checksum
    chunk.writeInt32LE(crc32(chunk), 22);

    // And write it out
    this.fstream.write(chunk);
  }

  end() {
    this.fstream.end();
  }
}
