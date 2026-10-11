import { useEffect, useRef, type ComponentType } from 'react';
import { AuthProvider } from './auth';
import { BackgroundProvider, useBackgrounds } from './backgrounds';
import Chat from './pages/Chat';
import BackgroundLayer from './components/BackgroundLayer';
import RippleLayer from './components/RippleLayer';
import Navbar from './components/Navbar';
import Contact from './pages/Contact';
import Expertise from './pages/Expertise';
import Home from './pages/Home';
import Login from './pages/Login';
import Profile from './pages/Profile';
import Story from './pages/Story';
import Tools from './pages/Tools';
import Work from './pages/Work';
import { PAGE_TITLES, useRoute, type Route } from './routes';

const PAGES: Record<Route, ComponentType> = {
  home: Home,
  story: Story,
  expertise: Expertise,
  work: Work,
  tools: Tools,
  contact: Contact,
  login: Login,
  profile: Profile,
  chat: Chat,
};

function Shell() {
  const { route, param } = useRoute();
  const { active } = useBackgrounds();
  const mainRef = useRef<HTMLElement>(null);
  const Page = PAGES[route];

  useEffect(() => {
    document.title = PAGE_TITLES[route];
    mainRef.current?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0 });
  }, [route, param]);

  return (
    <div className="min-h-[100dvh] bg-black lg:bg-white lg:p-6">
      <div className="relative min-h-[100dvh] lg:min-h-0 lg:h-[calc(100vh-48px)] lg:rounded-3xl overflow-hidden">
        {/* Phones and tablets: the background is pinned to the whole screen so it is always full.
            Desktop: it fills the rounded card. */}
        <div className="fixed inset-0 lg:absolute z-0 overflow-hidden bg-black">
          <BackgroundLayer source={active} />
          <div className="absolute inset-0 bg-black/20 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10 pointer-events-none" />
        </div>

        <div className="relative z-10 flex flex-col min-h-[100dvh] lg:min-h-0 lg:h-full p-4 sm:p-6 md:p-8 gap-6">
          <Navbar route={route} />
          <main ref={mainRef} className="flex-1 min-h-0 flex flex-col lg:overflow-y-auto">
            <Page />
          </main>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BackgroundProvider>
        <Shell />
        <RippleLayer />
      </BackgroundProvider>
    </AuthProvider>
  );
}
