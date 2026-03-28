import type { Metadata } from "next";
import { Rubik, Secular_One } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { defaultTheme } from "@/lib/themes";

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["latin", "hebrew"],
});

const secularOne = Secular_One({
  variable: "--font-secular",
  subsets: ["latin", "hebrew"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "MathPlatform — לימוד מתמטיקה לכיתות א-ו",
  description: "צנצנת חזירים חשבון — פלטפורמת לימוד מתמטיקה אינטראקטיבית לילדים. תרגול יומי, משחקים, ומעקב התקדמות.",
  verification: {
    google: 'sodMM0Pk-LMKuvMIE7U0tFn_TuH516PH9FeS0OsrBd0',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body className={`${rubik.variable} ${secularOne.variable} font-sans antialiased`}>
        <ThemeProvider theme={defaultTheme}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
