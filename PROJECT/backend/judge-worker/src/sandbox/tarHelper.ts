/**
 * Simple, zero-dependency POSIX tar archive generator for injecting files into Docker containers
 */
export interface TarFileInput {
  name: string;
  content: string | Buffer;
}

export const createTarArchive = (files: TarFileInput[]): Buffer => {
  const chunks: Buffer[] = [];

  for (const file of files) {
    const fileBuffer = Buffer.isBuffer(file.content)
      ? file.content
      : Buffer.from(file.content, 'utf-8');

    // 512-byte tar header
    const header = Buffer.alloc(512);

    // File name (offset 0, length 100)
    header.write(file.name, 0, 100, 'utf-8');

    // File mode (offset 100, length 8) -> 0644
    header.write('0000644\0', 100, 8, 'utf-8');

    // UID & GID (offset 108 & 116, length 8) -> 0
    header.write('0000000\0', 108, 8, 'utf-8');
    header.write('0000000\0', 116, 8, 'utf-8');

    // File size in octal (offset 124, length 12)
    const sizeOctal = fileBuffer.length.toString(8).padStart(11, '0') + '\0';
    header.write(sizeOctal, 124, 12, 'utf-8');

    // Modification time in octal (offset 136, length 12)
    const mtimeOctal = Math.floor(Date.now() / 1000).toString(8).padStart(11, '0') + '\0';
    header.write(mtimeOctal, 136, 12, 'utf-8');

    // Checksum placeholder (8 spaces at offset 148)
    header.write('        ', 148, 8, 'utf-8');

    // Typeflag: '0' for regular file (offset 156, length 1)
    header.write('0', 156, 1, 'utf-8');

    // Magic & version: 'ustar\0' and '00' (offset 257 & 263)
    header.write('ustar\0', 257, 6, 'utf-8');
    header.write('00', 263, 2, 'utf-8');

    // Calculate checksum
    let checksum = 0;
    for (let i = 0; i < 512; i++) {
      checksum += header[i];
    }
    const checksumOctal = checksum.toString(8).padStart(6, '0') + '\0 ';
    header.write(checksumOctal, 148, 8, 'utf-8');

    chunks.push(header);
    chunks.push(fileBuffer);

    // Pad file content to 512-byte boundary
    const remainder = fileBuffer.length % 512;
    if (remainder !== 0) {
      chunks.push(Buffer.alloc(512 - remainder));
    }
  }

  // End of archive marker (two 512-byte zero blocks)
  chunks.push(Buffer.alloc(1024));

  return Buffer.concat(chunks);
};
