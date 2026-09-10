import { LoadingScreen } from '@/components/ui/loading-screen';

export default function RootLoading() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <LoadingScreen
        message="Loading Ilm Connect..."
        subtitle="Please wait while we prepare your view"
      />
    </div>
  );
}
