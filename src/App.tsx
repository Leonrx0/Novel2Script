import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import ProjectList from './pages/ProjectList'
import CreateProject from './pages/CreateProject'
import Editor from './pages/Editor'
import CharacterGraph from './pages/CharacterGraph'
import Analysis from './pages/Analysis'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/projects" element={<ProjectList />} />
        <Route path="/create" element={<CreateProject />} />
        <Route path="/editor/:id" element={<Editor />} />
        <Route path="/characters/:id" element={<CharacterGraph />} />
        <Route path="/analysis/:id" element={<Analysis />} />
      </Routes>
    </Layout>
  )
}

export default App
