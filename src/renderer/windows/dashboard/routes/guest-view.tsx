import logo from "@/renderer/assets/passlogo-small.png";

import { UserRound } from "lucide-react";
import { Button } from "@/renderer/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/renderer/components/ui/card"
import { Toaster } from "@/renderer/components/ui/toaster"
import { useToast } from "@/renderer/hooks/use-toast";
import { WindowIdentifier } from "@/shared/constants";


export const GuestView = () => {

  const { toast } = useToast()

  const handleLogin = () => { 
    api.window.open(WindowIdentifier.Main);
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-yellow-100 to-red-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-red-700 to-yellow-600 text-white p-3 flex justify-between items-center rounded-b-lg shadow-md">
        {/* Logo */}
        <div className="flex items-center">
          <img src={logo} alt="PASS College Logo" className="h-10 w-auto mr-2 rounded-full border-2 border-white" />
          <h1 className="text-2xl font-bold">Guest Dashboard</h1>
        </div>
        {/* User Info and Settings */}
        <div className="flex items-center space-x-2">
          <UserRound className="w-6 h-6 rounded-full" />
          <span className="text-sm mr-4">Guest User</span>
          <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </Button>
          
        </div>
      </header>

      {/* Main content */}
      <main className="flex-grow p-6 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Welcome Card */}
          <Card className="col-span-2 border-2 border-red-300">
            <CardHeader>
              <CardTitle className="text-red-700">Welcome, Guest!</CardTitle>
              <CardDescription>You're currently logged in as a guest user.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">As a guest, you have limited access to features. To unlock full functionality, please contact an administrator or log in with a registered account.</p>
              <Button className="bg-red-700 hover:bg-red-800" onClick={handleLogin}>
                Log In
              </Button>
            </CardContent>
          </Card>

          {/* Available Features */}
          <Card className="border-2 border-yellow-300">
            <CardHeader>
              <CardTitle className="text-red-700">Available Features</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li>View sample lessons</li>
                <li>Access public resources</li>
                <li>Try demo quizzes</li>
              </ul>
            </CardContent>
          </Card>

          {/* Get Started */}
          <Card className="border-2 border-red-300">
            <CardHeader>
              <CardTitle className="text-red-700">Get Started</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-gray-600">Explore our platform with these quick actions:</p>
              <div className="space-y-2">
                <Button className="w-full bg-red-700 hover:bg-red-800" onClick={() => toast({ title: "Sample Lesson", description: "Opening a sample lesson" })}>
                  View Sample Lesson
                </Button>
                <Button className="w-full bg-yellow-600 hover:bg-yellow-700" onClick={() => toast({ title: "Demo Quiz", description: "Starting a demo quiz" })}>
                  Try Demo Quiz
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-300 text-center p-1">
        <p className="text-xs text-gray-600">&copy; 2024 PASS College. All rights reserved.</p>
      </footer>

      <Toaster />
    </div>
  );
};
