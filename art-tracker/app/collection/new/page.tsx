import ArtworkForm from '@/components/ArtworkForm';

export default function NewArtworkPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-stone-800 mb-6">Add Artwork</h1>
      <ArtworkForm />
    </div>
  );
}
