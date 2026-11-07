import mongoose, { Types } from 'mongoose';
import { PersonSchema } from './schemas/person.schema.js';
import { SiteSchema } from './schemas/site.schema.js';
import { ArrivedVia, VisitSchema } from './schemas/visit.schema.js';

const uri = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/small_web';
const PersonModel = mongoose.model('Person', PersonSchema);
const SiteModel = mongoose.model('Site', SiteSchema);
const VisitModel = mongoose.model('Visit', VisitSchema);
type SeedVisit = {
  personId: Types.ObjectId | undefined;
  address: string;
  siteId: Types.ObjectId | null | undefined;
  arrivedVia: ArrivedVia;
  visitedAt: Date;
};

const people = ['Ali', 'Maya', 'Noor', 'Ravi'].map((name) => ({ name }));
const sites = [
  ['tidepool.zz', 'Tidepool Notes', 'Maya', 'The tidepool keeps a small calendar of returning water. Visit reedbank.zz to follow the shoreline.'],
  ['reedbank.zz', 'Reedbank Field Guide', 'Maya', 'Reedbank is a quiet place for patient walkers. The old observatory is at lantern.zz.'],
  ['lantern.zz', 'Lantern Room', 'Noor', 'A lantern is useful when the map is incomplete. Find the history of maps at atlas.zz.'],
  ['atlas.zz', 'The Atlas Room', 'Noor', 'Every atlas is an argument about what matters. The tidepool is still visible from here.'],
  ['mossline.zz', 'Mossline Journal', 'Ravi', 'Moss grows slowly along the mossline. A train once connected it to tidepool.zz.'],
  ['copperfield.zz', 'Copperfield Workshop', 'Ravi', 'Copper remembers heat and hands. The workshop links to mossline.zz and the broken kiln.zz.'],
  ['nightjar.zz', 'Nightjar Almanac', 'Maya', 'The nightjar sings after sunset. Its route crosses reedbank.zz and nowhere.zz.'],
  ['commonroom.zz', 'Common Room', 'Ali', 'The common room collects stories from every corner of the small web.'],
  ['driftwood.zz', 'Driftwood Letters', 'Ali', 'Driftwood carries messages without promising a destination. Read more at commonroom.zz.'],
  ['signal.zz', 'Signal Practice', 'Noor', 'A signal is a question sent across distance. The answer may arrive from lantern.zz.'],
] as const;

function htmlFor(address: string, prose: string): string {
  const links = prose.match(/([a-z]+\.zz)/g) ?? [];
  const body = prose.replace(/([a-z]+\.zz)/g, '<a href="$1">$1</a>');
  return `<article><h1>${address}</h1><p>${body}</p>${links.length ? `<p>Continue: ${links.map((link) => `<a href="${link}">${link}</a>`).join(' ')}</p>` : ''}</article>`;
}

async function seed(): Promise<void> {
  await mongoose.connect(uri);
  const personIds = new Map<string, Types.ObjectId>();

  for (const person of people) {
    const saved = await PersonModel.findOneAndUpdate(
      { name: person.name },
      { $set: person },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    personIds.set(person.name, saved._id);
  }

  const siteIds = new Map<string, Types.ObjectId>();
  for (const [address, title, author, prose] of sites) {
    const saved = await SiteModel.findOneAndUpdate(
      { address },
      {
        $set: {
          address,
          title,
          html: htmlFor(address, prose),
          authorId: personIds.get(author),
          searchableText: `${title} ${prose}`,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    siteIds.set(address, saved._id);
  }

  await VisitModel.deleteMany({});
  const trails: Array<[string, string[], Date]> = [
    ['Ali', ['tidepool.zz', 'reedbank.zz', 'lantern.zz', 'atlas.zz', 'mossline.zz', 'copperfield.zz', 'nightjar.zz', 'commonroom.zz', 'driftwood.zz', 'lantern.zz', 'atlas.zz', 'missing.zz'], new Date(Date.UTC(2026, 0, 1, 10))],
    ['Maya', ['mossline.zz', 'tidepool.zz', 'reedbank.zz', 'tidepool.zz', 'nightjar.zz'], new Date(Date.UTC(2026, 0, 1, 11))],
    ['Noor', ['signal.zz', 'lantern.zz', 'missing.zz'], new Date(Date.UTC(2026, 0, 1, 12))],
    ['Ravi', ['copperfield.zz', 'mossline.zz', 'commonroom.zz'], new Date(Date.UTC(2026, 0, 1, 13))],
  ];
  const visitDocs: SeedVisit[] = [];
  for (const [person, trail, start] of trails) {
    trail.forEach((address, index) => {
      const firstVisit = index === 0;
      const previousAddress = index > 0 ? trail[index - 1] : undefined;
      const arrivedVia = !firstVisit && address === previousAddress
        ? ArrivedVia.Back
        : firstVisit
          ? ArrivedVia.Typed
          : ArrivedVia.Link;
      visitDocs.push({
        personId: personIds.get(person),
        address,
        siteId: siteIds.get(address) ?? null,
        arrivedVia,
        visitedAt: new Date(start.getTime() + index * 5 * 60_000),
      });
    });
  }
  visitDocs.push({
    personId: personIds.get('Maya'),
    address: 'atlas.zz',
    siteId: siteIds.get('atlas.zz') ?? null,
    arrivedVia: ArrivedVia.Search,
    visitedAt: new Date(Date.UTC(2026, 0, 1, 11, 30)),
  });
  await VisitModel.insertMany(visitDocs);
  console.log(`Seeded ${people.length} people, ${sites.length} sites, and ${visitDocs.length} visits.`);
}

seed()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
