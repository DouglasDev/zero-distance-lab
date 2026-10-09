import { styled } from '@linaria/react';

export const Page = styled.main`
  max-width: 1140px;
  margin: auto;
  padding: 28px 24px 40px;
`;
export const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 28px;
  h1 {
    font-size: 23px;
    letter-spacing: -0.04em;
    margin: 0 0 5px;
    font-weight: 500;
  }
  p {
    color: #acb9ae;
    margin: 0;
    font-size: 14px;
  }
  @media (max-width: 600px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;
export const Layout = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 260px;
  gap: 22px;
  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;
export const Modes = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 14px;
  button {
    flex: 1;
    padding: 12px;
    color: #b9c5b8;
    background: transparent;
    border: 1px solid #38453b;
    border-radius: 6px;
    white-space: nowrap;
  }
  button[aria-pressed='true'] {
    color: #e2e8d1;
    background: #2b382b;
    border-color: #95a17d;
  }
`;
export const Stage = styled.div`
  overflow: hidden;
  border-radius: 8px;
  border: 1px solid #38453b;
  position: relative;
  &:fullscreen {
    display: flex;
    align-items: center;
    justify-content: center;
    background: #101715;
    border: none;
    border-radius: 0;
  }
  &:fullscreen > div:first-child {
    width: min(100vw, 177.77vh);
  }
`;
export const Overlay = styled.div`
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  text-align: center;
  background: #10171588;
  pointer-events: none;
  strong {
    font-size: 72px;
    font-weight: 500;
  }
  span {
    padding: 12px;
    background: #101715dd;
    border-radius: 6px;
  }
`;
export const StageFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin: 12px 0;
  span {
    color: #b8c4b7;
    font-size: 13px;
  }
`;
export const Panel = styled.aside`
  padding-top: 3px;
  h2 {
    font-size: 18px;
    font-weight: 500;
    margin: 0 0 12px;
  }
  p {
    font-size: 14px;
    color: #bdc8ba;
    line-height: 1.6;
    margin: 0 0 20px;
  }
`;
export const Alert = styled.div`
  padding: 12px 16px;
  border: 1px solid #937b57;
  color: #edcca0;
  border-radius: 6px;
  margin-bottom: 16px;
  font-size: 14px;
  line-height: 1.5;
`;
