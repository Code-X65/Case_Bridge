import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';

/**
 * Common layout for all Visitor (unauthenticated) pages.
 * Includes global nav and footer, without Client Portal navigation.
 */
export default function VisitorLayout() {
    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground font-sans">
            <Header />
            <main className="flex-1 w-full max-w-7xl mx-auto flex flex-col pt-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
                <Outlet />
            </main>
            <Footer />
        </div>
    );
}
