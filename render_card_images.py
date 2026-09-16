"""Re-render source PDF cards without altering character data or reviews."""
from pathlib import Path
import pdfplumber
root=Path(__file__).resolve().parent
with pdfplumber.open(root/'data/sources/character-cards-all-aug-2026.pdf') as pdf:
 for n,page in enumerate(pdf.pages,1):
  page.to_image(resolution=360).original.save(root/'data/cards'/f'{n:03}.png')
  page.close()
print(f'Rendered {n} cards at 360 DPI.')
