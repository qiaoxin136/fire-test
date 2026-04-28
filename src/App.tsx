import { useEffect, useState } from "react";
import type { Schema } from "../amplify/data/resource";
import { generateClient } from "aws-amplify/data";
import { Authenticator, useAuthenticator } from "@aws-amplify/ui-react";
import FireTestMap from "./components/FireTestMap";
import FireTestPanel from "./components/FireTestPanel";

const client = generateClient<Schema>();

// Inner component — only rendered once the user is signed in
function AppShell() {
  const { user, signOut } = useAuthenticator((ctx) => [ctx.user]);

  const [fireTests, setFireTests] = useState<Array<Schema["FireTest"]["type"]>>([]);
  const [isPlacingPoint, setIsPlacingPoint] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const sub = client.models.FireTest.observeQuery().subscribe({
      next: ({ items }) => setFireTests([...items]),
    });
    return () => sub.unsubscribe();
  }, []);

  function handleStartPlacing() {
    setIsPlacingPoint(true);
  }

  async function handlePointPlaced(lat: number, lng: number) {
    setIsPlacingPoint(false);
    const { data } = await client.models.FireTest.create({ lat, lng });
    if (data) setSelectedId(data.id);
  }

  function handleCancelPlacing() {
    setIsPlacingPoint(false);
  }

  return (
    <div className="app-layout">
      <FireTestPanel
        fireTests={fireTests}
        isPlacingPoint={isPlacingPoint}
        onStartPlacing={handleStartPlacing}
        selectedId={selectedId}
        onSelectId={setSelectedId}
        userEmail={user?.signInDetails?.loginId ?? user?.username ?? ""}
        onSignOut={signOut}
      />
      <div className="map-container">
        <FireTestMap
          fireTests={fireTests}
          isPlacingPoint={isPlacingPoint}
          onPointPlaced={handlePointPlaced}
          onCancelPlacing={handleCancelPlacing}
          selectedId={selectedId}
          onSelectId={setSelectedId}
        />
      </div>
    </div>
  );
}

// Outer component — wraps everything in the Authenticator gate
function App() {
  return (
    <Authenticator>
      <AppShell />
    </Authenticator>
  );
}

export default App;
