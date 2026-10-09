import { useState } from 'react';
import { styled } from '@linaria/react';
import { PhaserCanvas } from './PhaserCanvas';

const Page = styled.main`
  max-width: 1120px;
  margin: 0 auto;
  padding: 28px 24px 64px;
`;
const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 0 24px;
  border-bottom: 1px solid #2d405e;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: .12em;
  color: #bdd0eb;
  span { color: #8fb9ff; }
`;
const Badge = styled.span`
  border: 1px solid #476487;
  border-radius: 999px;
  padding: 8px 12px;
  color: #c8daf3;
  letter-spacing: .03em;
  font-weight: 500;
`;
const Hero = styled.section`
  padding: 72px 0 35px;
  h1 { font-size: clamp(44px, 7vw, 78px); letter-spacing: -.055em; line-height: 1.06; margin: 0 0 20px; }
  p { max-width: 650px; color: #aabdd7; line-height: 1.7; font-size: 17px; margin: 0; }
  @media (max-width: 600px) { padding-top: 48px; }
`;
const Highlight = styled.span`color: #8fb9ff;`;
const DemoHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: 18px 0 15px;
  h2 { font-size: 16px; font-weight: 600; margin: 0; }
`;
const Button = styled.button`
  border: 1px solid #5978a3;
  border-radius: 9px;
  background: #243a59;
  color: #e5efff;
  padding: 10px 15px;
  &:hover { background: #305078; }
`;
const Empty = styled.div`
  display: grid;
  place-items: center;
  width: 100%;
  aspect-ratio: 16 / 9;
  border: 1px dashed #476487;
  border-radius: 18px;
  color: #aabdd7;
`;
const Notes = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-top: 26px;
  @media (max-width: 700px) { grid-template-columns: 1fr; }
`;
const Note = styled.div`
  border: 1px solid #2d405e;
  border-radius: 12px;
  padding: 19px;
  background: #17243a;
  strong { display: block; margin-bottom: 6px; color: #dce9ff; }
  span { font-size: 13px; line-height: 1.5; color: #aabdd7; }
`;

export function App() {
  const [showCanvas, setShowCanvas] = useState(true);

  return <Page>
    <Header><div>YOUR <span>PROJECT</span></div><Badge>React · Linaria · Phaser · TypeScript</Badge></Header>
    <Hero>
      <h1>Start with a <Highlight>working canvas.</Highlight></h1>
      <p>A minimal front-end scaffold with React for interface state, Linaria for styles, and Phaser for graphics. Replace this screen with your project.</p>
    </Hero>
    <DemoHeader>
      <h2>Phaser demo</h2>
      <Button onClick={() => setShowCanvas(value => !value)}>{showCanvas ? 'Hide canvas' : 'Show canvas'}</Button>
    </DemoHeader>
    {showCanvas ? <PhaserCanvas /> : <Empty>Canvas unmounted</Empty>}
    <Notes>
      <Note><strong>React</strong><span>Build screens and manage simple interface state.</span></Note>
      <Note><strong>Linaria</strong><span>Write colocated styles that extract at build time.</span></Note>
      <Note><strong>Phaser</strong><span>Render scenes and handle graphical interactions.</span></Note>
    </Notes>
  </Page>;
}
