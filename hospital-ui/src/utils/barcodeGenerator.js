import React from "react";

/**
 * Bộ tạo mã vạch Barcode SVG chuẩn Code 128 (Code 128B)
 * Tương thích 100% với các máy in nhiệt K80 (80mm) và đầu đọc mã vạch Laser / CMOS.
 * Không cần cài thêm thư viện phụ thuộc bên ngoài.
 */

// Bảng mẫu mã hóa Code 128 (patterns): mỗi ký tự biểu diễn bằng độ rộng của 3 vạch và 3 khoảng trắng (hoặc 4/3 cho stop)
// Độ rộng tính theo module (1 đến 4). Tổng chiều dài mỗi ký tự = 11 modules (stop = 13 modules).
const CODE128_PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213", // 0-9
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132", // 10-19
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211", // 20-29
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313", // 30-39
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331", // 40-49
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111", // 50-59
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214", // 60-69
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111", // 70-79
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141", // 80-89
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141", // 90-99
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112" // 100-106 (104=Start B, 106=Stop)
];

const START_B = 104;
const STOP = 106;

/**
 * Mã hóa chuỗi text thành mảng các pattern index Code 128
 */
function encodeCode128B(text) {
  const codes = [START_B];
  let checkSum = START_B;

  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    // Ký tự ASCII từ 32 (space) đến 126 (~) tương ứng code 0..94
    let val = charCode - 32;
    if (val < 0 || val > 95) val = 0; // Fallback nếu ký tự ngoài vùng
    codes.push(val);
    checkSum += val * (i + 1);
  }

  const checkDigit = checkSum % 103;
  codes.push(checkDigit);
  codes.push(STOP);

  return codes;
}

/**
 * Sinh chuỗi SVG mã vạch Code 128 dạng raw SVG HTML
 * @param {string} text - Chuỗi cần mã hóa (ví dụ: "BK-1029", "KB-05")
 * @param {object} options - Cấu hình độ cao, độ rộng module, hiển thị text...
 */
export function generateBarcodeSvg(text, options = {}) {
  if (!text) return "";

  const cleanText = String(text).toUpperCase().replace(/[^A-Z0-9_-]/g, "");
  const codeList = encodeCode128B(cleanText || "TICKET");

  const moduleWidth = options.moduleWidth || 2;
  const height = options.height || 50;
  const showText = options.showText !== false;
  const quietZone = options.quietZone !== false ? 10 : 2;

  // Chuyển đổi mã thành chuỗi các vạch đen (1) và trắng (0)
  let binaryString = "";
  codeList.forEach((codeIdx) => {
    const pattern = CODE128_PATTERNS[codeIdx] || CODE128_PATTERNS[0];
    let isBar = true;
    for (let i = 0; i < pattern.length; i++) {
      const width = parseInt(pattern[i], 10);
      binaryString += (isBar ? "1" : "0").repeat(width);
      isBar = !isBar;
    }
  });

  const totalModules = binaryString.length;
  const totalWidth = totalModules * moduleWidth + quietZone * 2;
  const totalHeight = height + (showText ? 18 : 0);

  // Sinh các thẻ <rect> cho vạch đen
  let rects = "";
  let x = quietZone;
  let runLength = 0;
  let currentColor = "0";

  for (let i = 0; i < binaryString.length; i++) {
    const bit = binaryString[i];
    if (bit === currentColor) {
      runLength++;
    } else {
      if (currentColor === "1") {
        rects += `<rect x="${x}" y="2" width="${runLength * moduleWidth}" height="${height}" fill="#000000" />`;
      }
      x += runLength * moduleWidth;
      currentColor = bit;
      runLength = 1;
    }
  }
  if (currentColor === "1") {
    rects += `<rect x="${x}" y="2" width="${runLength * moduleWidth}" height="${height}" fill="#000000" />`;
  }

  const textElement = showText
    ? `<text x="${totalWidth / 2}" y="${height + 15}" font-family="monospace, Courier, sans-serif" font-size="12" font-weight="bold" text-anchor="middle" letter-spacing="2" fill="#000000">${cleanText}</text>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="${totalWidth}" height="${totalHeight}" style="display:block;margin:0 auto;background:#ffffff;">
    <rect width="${totalWidth}" height="${totalHeight}" fill="#ffffff" />
    ${rects}
    ${textElement}
  </svg>`;
}

/**
 * Component React hiển thị Barcode SVG trực tiếp
 */
export function BarcodeView({ value, height = 48, moduleWidth = 2, showText = true, style = {} }) {
  const svgHtml = generateBarcodeSvg(value, { height, moduleWidth, showText });
  return React.createElement("div", {
    style: { display: "inline-block", textAlign: "center", ...style },
    dangerouslySetInnerHTML: { __html: svgHtml }
  });
}
