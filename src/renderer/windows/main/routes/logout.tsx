import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/renderer/components/ui/card';
import { Loader2 } from 'lucide-react';
import { Device } from '@prisma/client';

export default function LogoutPage() {
    const navigate = useNavigate();

    useEffect(() => {


        // Clear local storage
        localStorage.clear();

        // Clear session storage
        sessionStorage.clear();

        // Redirect to login page after 2 seconds
        const timer = setTimeout(async () => {
            const device: Device = await api.database.getDevice();

            if (!device) {
                throw new Error('No device information found');
            }

            const activeUser = await api.database.getActiveUserByDeviceId(
                device.id,
                device.labId
            );

            api.database.userLogout(activeUser.userId)
            api.window.send('logout-complete', true);
        }, 2000);

        return () => clearTimeout(timer);
    }, [navigate]);

    return (
        <div className="container flex h-screen w-screen flex-col items-center justify-center">
            <Card className="w-[350px]">
                <CardContent className="pt-6 text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                    <p className="mt-4 text-lg text-muted-foreground">Logging out...</p>
                </CardContent>
            </Card>
        </div>
    );
}
