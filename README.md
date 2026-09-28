# Pasture Plate

Pasture Plate is a small, offline-friendly forage and toxicity quick-check for rabbits and hens. It is intentionally a starting point, not a feeding prescription or veterinary diagnosis.

## Local development

```bash
npm install
npm run build
npm run watch
```

The built static site lives in `docs/`. The app uses Tailwind CSS for styling and plain JavaScript for the UI. Plant records are in `src/data/plants.json` and are copied to `docs/data/plants.json` during a build.

## Sources

Plant cards link to the Rabbit Welfare Association & Fund rabbit diet guidance, Merck Veterinary Manual poultry feeding and plant poisoning guidance, and ASPCA toxic/non-toxic plant references. If a plant is uncertain, treat it as unknown and contact a veterinarian for suspected exposure.

## License

Content and code are provided for educational use. Verify plant identity and local veterinary guidance before feeding.
