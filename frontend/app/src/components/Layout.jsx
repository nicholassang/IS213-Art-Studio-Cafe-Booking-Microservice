export default function Layout({ children }) {
  return (
    <div
      style={{
        background: "#faf8f5",
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        justifyContent: "center"
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1400px",  
          padding: "40px 40px"
        }}
      >
        {children}
      </div>
    </div>
  );
}