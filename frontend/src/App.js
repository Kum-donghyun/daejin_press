import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import MainPage from './pages/MainPage';
import AdminPanel from './pages/AdminPanel';
import CreateNewspaper from './pages/CreateNewspaper';
import NewspaperDetail from './pages/NewspaperDetail';
import ArticleWrite from './pages/ArticleWrite';
import ReporterPanel from './pages/ReporterPanel';
import ArticleDetail from './pages/ArticleDetail';
import OnlineArticleWrite from './pages/OnlineArticleWrite';
import OnlineArticleDetail from './pages/OnlineArticleDetail';
import SectionPage from './pages/SectionPage';
import ContactPage from './pages/ContactPage';
import SearchPage from './pages/SearchPage';
import Toast from './components/Toast';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-[#f4f4f0]">
          <Navbar />
          <Routes>
            <Route path="/" element={<MainPage />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/admin/create-newspaper" element={<CreateNewspaper />} />
            <Route path="/admin/newspaper/:id" element={<NewspaperDetail mode="admin" />} />
            <Route path="/write" element={<ReporterPanel />} />
            <Route path="/write/newspaper/:id" element={<NewspaperDetail mode="reporter" />} />
            <Route path="/write/article/:sectionId" element={<ArticleWrite />} />
            <Route path="/write/online" element={<OnlineArticleWrite />} />
            <Route path="/write/online/:id" element={<OnlineArticleWrite />} />
            <Route path="/article/:articleId" element={<ArticleDetail />} />
            <Route path="/online-article/:id" element={<OnlineArticleDetail />} />
            <Route path="/section/:section" element={<SectionPage />} />
            <Route path="/contact/:type" element={<ContactPage />} />
            <Route path="/search" element={<SearchPage />} />
          </Routes>
          <Toast />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
