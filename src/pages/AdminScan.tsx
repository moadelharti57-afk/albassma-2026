import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Camera, CameraOff, ArrowLeft, QrCode } from 'lucide-react';

const AdminScan = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [hasCamera, setHasCamera] = useState(true);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const startScanning = async () => {
    // Set scanning state first so the container is visible
    setIsScanning(true);
    
    // Wait for the DOM to update
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          // Extract ticket code from URL or use directly
          let ticketCode = decodedText;
          try {
            const url = new URL(decodedText);
            const ticket = url.searchParams.get('ticket');
            if (ticket) ticketCode = ticket;
          } catch {
            // Not a URL, use as-is
          }

          scanner.stop().then(() => {
            setIsScanning(false);
            navigate(`/verify?ticket=${ticketCode}`);
          });
        },
        () => {
          // QR scan failure - ignore, continue scanning
        }
      );
    } catch (error: any) {
      console.error('Scanner error:', error);
      setIsScanning(false);
      setHasCamera(false);
      toast({
        title: 'Camera Error',
        description: 'Could not access camera. Please check permissions.',
        variant: 'destructive',
      });
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current?.isScanning) {
      await scannerRef.current.stop();
      setIsScanning(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-4 px-3 sm:py-12 sm:px-4">
      <div className="container max-w-lg mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 sm:mb-6 transition-colors text-sm sm:text-base py-2">
          <ArrowLeft className="w-5 h-5" />
          Back to Home
        </Link>

        <Card className="border-primary/20 shadow-lg">
          <CardHeader className="text-center pb-2 sm:pb-6">
            <div className="w-14 h-14 sm:w-12 sm:h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <QrCode className="w-7 h-7 sm:w-6 sm:h-6 text-primary" />
            </div>
            <CardTitle className="text-xl sm:text-2xl">QR Scanner</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Point camera at ticket QR code
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-3 sm:px-6">
            {!hasCamera ? (
              <div className="text-center py-6 sm:py-8">
                <CameraOff className="w-14 h-14 sm:w-16 sm:h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4 text-sm sm:text-base">
                  Camera access is required to scan QR codes.
                </p>
                <Button onClick={() => setHasCamera(true)} variant="outline" size="lg" className="min-h-12">
                  Try Again
                </Button>
              </div>
            ) : (
              <>
                <div 
                  id="qr-reader" 
                  className={`w-full rounded-lg overflow-hidden bg-muted ${!isScanning ? 'hidden' : ''}`}
                  style={{ minHeight: isScanning ? '350px' : '0' }}
                />

                {!isScanning && (
                  <div className="text-center py-6 sm:py-8">
                    <Camera className="w-14 h-14 sm:w-16 sm:h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4 text-sm sm:text-base">
                      Tap the button below to start scanning
                    </p>
                  </div>
                )}

                <Button 
                  className="w-full min-h-14 text-base sm:text-lg font-medium" 
                  onClick={isScanning ? stopScanning : startScanning}
                  variant={isScanning ? 'outline' : 'default'}
                  size="lg"
                >
                  {isScanning ? (
                    <>
                      <CameraOff className="mr-2 h-5 w-5" />
                      Stop Scanning
                    </>
                  ) : (
                    <>
                      <Camera className="mr-2 h-5 w-5" />
                      Start Scanning
                    </>
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Quick Links - larger touch targets for mobile */}
        <div className="mt-6 flex flex-col gap-3">
          <Link 
            to="/admin/dashboard" 
            className="block text-center text-primary hover:text-primary/80 font-medium transition-colors py-3 px-4 bg-primary/5 rounded-lg"
          >
            View Dashboard →
          </Link>
          <Link 
            to="/verify" 
            className="block text-center text-muted-foreground hover:text-primary transition-colors py-3 px-4 bg-muted/50 rounded-lg"
          >
            Manual ticket verification →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminScan;
