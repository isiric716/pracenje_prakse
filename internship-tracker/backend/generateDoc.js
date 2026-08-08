const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType, VerticalAlign
} = require('docx');
const fs = require('fs');

const data = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const { student, docInfo, entries } = data;

const border = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
const borders = { top: border, bottom: border, left: border, right: border };
const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };

const W = 9360;

function headerCell(text, colSpan) {
  return new TableCell({
    borders,
    width: { size: W, type: WidthType.DXA },
    shading: { fill: "D9E2F3", type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    columnSpan: colSpan,
    children: [new Paragraph({
      children: [new TextRun({ text, bold: true, size: 22, font: "Arial" })]
    })]
  });
}

function labelCell(text, width) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({
      children: [new TextRun({ text, size: 20, font: "Arial" })]
    })]
  });
}

function valueCell(text, width) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({
      children: [new TextRun({ text: text || "", size: 20, font: "Arial" })]
    })]
  });
}

function dataRow(label, value) {
  return new TableRow({
    children: [
      labelCell(label, 3500),
      valueCell(value, W - 3500),
    ]
  });
}

const sortedEntries = [...entries].sort(
  (a, b) => new Date(a.entry_date) - new Date(b.entry_date)
);

const diaryRows = [];
diaryRows.push(new TableRow({
  children: [
    new TableCell({
      borders,
      columnSpan: 2,
      shading: { fill: "D9E2F3", type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      width: { size: W, type: WidthType.DXA },
      children: [new Paragraph({
        children: [new TextRun({ text: "Opis radnih zadataka u sastavu stručne prakse, po danima", bold: true, size: 22, font: "Arial" })]
      })]
    })
  ]
}));

sortedEntries.forEach((entry, i) => {
  diaryRows.push(new TableRow({
    children: [
      new TableCell({
        borders,
        columnSpan: 2,
        width: { size: W, type: WidthType.DXA },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        shading: { fill: "EEF2F9", type: ShadingType.CLEAR },
        children: [new Paragraph({
          children: [new TextRun({ text: `Dan ${i + 1} – ${entry.entry_date}  (${entry.hours} sati)`, bold: true, size: 20, font: "Arial" })]
        })]
      })
    ]
  }));
  diaryRows.push(new TableRow({
    children: [
      new TableCell({
        borders,
        columnSpan: 2,
        width: { size: W, type: WidthType.DXA },
        margins: { top: 100, bottom: 100, left: 120, right: 120 },
        children: [new Paragraph({
          children: [new TextRun({ text: entry.description || "", size: 20, font: "Arial", italics: true })]
        })]
      })
    ]
  }));
});

const totalHours = sortedEntries.reduce((sum, e) => sum + Number(e.hours), 0);

const doc = new Document({
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 }
      }
    },
    children: [
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 200 }, children: [new TextRun({ text: "Sveučilište Josipa Jurja Strossmayera u Osijeku", bold: true, size: 22, font: "Arial" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 200 }, children: [new TextRun({ text: "Fakultet primijenjene matematike i informatike", bold: true, size: 22, font: "Arial" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 400 }, children: [new TextRun({ text: "Trg Ljudevita Gaja 6, HR-31000 Osijek", size: 20, font: "Arial" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 200 }, children: [new TextRun({ text: "STRUČNA PRAKSA ZA STUDENTE", bold: true, size: 28, font: "Arial" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 600 }, children: [new TextRun({ text: "FAKULTETA PRIMIJENJENE MATEMATIKE I INFORMATIKE", bold: true, size: 24, font: "Arial" })] }),

      new Table({
        width: { size: W, type: WidthType.DXA },
        columnWidths: [3500, W - 3500],
        rows: [
          new TableRow({ children: [headerCell("Osnovni podaci o studentu/studentici", 2)] }),
          dataRow("Prezime i ime:", student.fullName || ""),
          dataRow("Matični broj:", docInfo.indexNumber || ""),
          dataRow("Studij i modul:", docInfo.study || ""),
          dataRow("Godina studiranja:", docInfo.year || ""),
        ]
      }),

      new Paragraph({ spacing: { before: 200, after: 0 }, children: [] }),

      new Table({
        width: { size: W, type: WidthType.DXA },
        columnWidths: [3500, W - 3500],
        rows: [
          new TableRow({ children: [headerCell("Osnovni podaci o nositeljima stručne prakse", 2)] }),
          dataRow("Tvrtka i mjesto:", docInfo.companyName || ""),
          new TableRow({ children: [headerCell("Voditelj stručne prakse u tvrtki", 2)] }),
          dataRow("Prezime i ime:", docInfo.mentor || ""),
          dataRow("E-mail:", docInfo.mentorEmail || ""),
          dataRow("Telefon:", docInfo.mentorPhone || ""),
          new TableRow({ children: [headerCell("Nastavnik Fakulteta zadužen za praćenje stručne prakse", 2)] }),
          dataRow("Prezime i ime:", docInfo.teacherName || ""),
          dataRow("E-mail:", docInfo.teacherEmail || ""),
          dataRow("Telefon:", docInfo.teacherPhone || ""),
        ]
      }),

      new Paragraph({ spacing: { before: 200, after: 0 }, children: [] }),

      new Table({
        width: { size: W, type: WidthType.DXA },
        columnWidths: [3500, W - 3500],
        rows: [
          new TableRow({ children: [headerCell("Osnovni podaci o stručnoj praksi", 2)] }),
          dataRow("Datum početka stručne prakse:", docInfo.startDate || ""),
          dataRow("Datum završetka stručne prakse:", docInfo.endDate || ""),
          dataRow("Ukupno odrađenih sati:", `${totalHours} sati`),
          dataRow("Kratki opis radnih zadataka:", docInfo.taskDescription || ""),
        ]
      }),

      new Paragraph({ spacing: { before: 400, after: 200 }, children: [new TextRun({ text: "DNEVNIK STRUČNE PRAKSE", bold: true, size: 28, font: "Arial" })] }),

      new Table({
        width: { size: W, type: WidthType.DXA },
        columnWidths: [W / 2, W / 2],
        rows: diaryRows
      }),

      new Paragraph({ spacing: { before: 400, after: 200 }, children: [] }),

      new Table({
        width: { size: W, type: WidthType.DXA },
        columnWidths: [W],
        rows: [
          new TableRow({ children: [headerCell("Zaključak i mišljenje studenta/studentice o stručnoj praksi", 1)] }),
          new TableRow({
            children: [new TableCell({
              borders,
              width: { size: W, type: WidthType.DXA },
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              children: [
                new Paragraph({ children: [new TextRun({ text: docInfo.conclusion || "", size: 20, font: "Arial" })] }),
                new Paragraph({ spacing: { before: 600 }, children: [] }),
              ]
            })]
          })
        ]
      }),

      new Paragraph({ spacing: { before: 600, after: 200 }, children: [] }),

      new Table({
        width: { size: W, type: WidthType.DXA },
        columnWidths: [W / 3, W / 3, W / 3],
        rows: [
          new TableRow({
            children: [
              new TableCell({ borders, width: { size: W / 3, type: WidthType.DXA }, margins: { top: 200, bottom: 200, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: "Voditelj stručne prakse u tvrtki", size: 18, font: "Arial" })] }), new Paragraph({ spacing: { before: 400 }, children: [new TextRun({ text: "_____________________", size: 18, font: "Arial" })] })] }),
              new TableCell({ borders, width: { size: W / 3, type: WidthType.DXA }, margins: { top: 200, bottom: 200, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: "Student/ica", size: 18, font: "Arial" })] }), new Paragraph({ spacing: { before: 400 }, children: [new TextRun({ text: "_____________________", size: 18, font: "Arial" })] })] }),
              new TableCell({ borders, width: { size: W / 3, type: WidthType.DXA }, margins: { top: 200, bottom: 200, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: "Nastavnik Fakulteta zadužen za praćenje", size: 18, font: "Arial" })] }), new Paragraph({ spacing: { before: 400 }, children: [new TextRun({ text: "_____________________", size: 18, font: "Arial" })] })] }),
            ]
          })
        ]
      }),
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  const path = process.argv[3] || '/tmp/dnevnik.docx';
  fs.writeFileSync(path, buffer);
  console.log('OK');
});