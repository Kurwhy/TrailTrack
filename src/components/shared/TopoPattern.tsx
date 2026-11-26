interface TopoPatternProps {
  className?: string;
}

/**
 * Decorative topographic contour lines drawn in the current text color.
 * Used on the hero and gear card headers as the trail-map identity motif.
 */
export function TopoPattern({ className }: TopoPatternProps) {
  return (
    <svg
      viewBox="0 0 600 400"
      fill="none"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
      className={className}
    >
      <g stroke="currentColor" strokeWidth="1.1" strokeLinecap="round">
        <path d="M-30 300C40 205 120 150 210 168C305 187 352 262 306 322C260 382 150 392 78 352C40 331 18 322-30 350" />
        <path d="M-20 318C48 228 124 178 208 196C294 214 330 278 290 328C248 380 154 382 90 344C58 325 34 318-20 348" />
        <path d="M0 338C64 258 132 214 206 230C280 246 306 300 274 336C240 374 166 372 112 348C86 336 58 330 0 350" />
        <path d="M40 356C92 298 146 264 204 276C260 288 280 324 258 348C236 372 184 368 146 356C116 346 86 344 40 356" />
        <path d="M332 128C402 70 494 78 558 132C622 186 610 282 532 310C454 338 372 300 356 226C346 178 292 150 332 128" />
        <path d="M352 150C412 104 490 110 540 154C590 198 580 272 518 296C456 320 392 290 380 234C372 196 322 170 352 150" />
        <path d="M374 174C422 140 484 144 520 178C556 212 550 262 504 280C458 298 412 276 404 236C398 208 352 190 374 174" />
        <path d="M398 198C432 176 472 178 494 200C516 222 514 250 486 262C458 274 430 262 426 238C422 222 388 210 398 198" />
        <path d="M250 40C300 10 380 18 420 56C460 94 440 150 382 160C324 170 270 140 266 96C264 70 224 56 250 40" />
        <path d="M120 64C156 40 212 44 244 70C276 96 264 136 226 146C188 156 150 138 146 108C144 88 100 76 120 64" />
        <path d="M60 220C96 196 150 200 180 226C210 252 200 288 164 298C128 308 92 290 88 262C86 242 44 230 60 220" />
      </g>
    </svg>
  );
}
