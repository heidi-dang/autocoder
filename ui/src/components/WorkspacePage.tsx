import { WorkspaceLayout } from '@/components/workspace/WorkspaceLayout';
import { WorkflowStepper } from '@/components/workspace/WorkflowStepper';
import { SpecPane } from '@/components/workspace/SpecPane';
import { PlannerPane } from '@/components/workspace/PlannerPane';
import { CodePane } from '@/components/workspace/CodePane';
import { useWorkspaceStore } from '@/lib/workspace/state';
import { Button } from '@/components/ui/button';
import { Home, Github } from 'lucide-react';

interface WorkspacePageProps {
  onNavigate: (path: string) => void;
}

export function WorkspacePage({ onNavigate }: WorkspacePageProps) {
  const { isGenerating } = useWorkspaceStore();

  // Demo: populate with example data
  const loadDemo = () => {
    const { setSpecification, setPlan, setFileChanges, addContext } = useWorkspaceStore.getState();
    
    setSpecification('Build a user authentication system with email/password and OAuth support.');
    
    addContext({
      id: '1',
      label: 'auth.ts',
      type: 'file',
      content: '',
    });
    
    addContext({
      id: '2',
      label: 'https://jwt.io/introduction',
      type: 'url',
      content: '',
    });
    
    setPlan([
      {
        id: '1',
        text: 'Create database schema for users and sessions',
        completed: true,
        files: ['schema.sql'],
      },
      {
        id: '2',
        text: 'Implement JWT token generation and validation',
        completed: false,
        files: ['lib/auth.ts', 'lib/jwt.ts'],
      },
      {
        id: '3',
        text: 'Add OAuth providers (GitHub, Google)',
        completed: false,
        files: ['lib/oauth.ts', 'routes/auth.ts'],
      },
      {
        id: '4',
        text: 'Build login/signup UI components',
        completed: false,
        files: ['components/LoginForm.tsx', 'components/SignupForm.tsx'],
      },
    ]);
    
    setFileChanges([
      {
        path: 'lib/auth.ts',
        type: 'modified',
        originalContent: `export function login(email: string, password: string) {
  // TODO: implement
  return null;
}`,
        newContent: `import { hash, compare } from 'bcrypt';
import { sign } from 'jsonwebtoken';

export async function login(email: string, password: string) {
  const user = await db.user.findUnique({ where: { email } });
  if (!user) throw new Error('Invalid credentials');
  
  const valid = await compare(password, user.password);
  if (!valid) throw new Error('Invalid credentials');
  
  const token = sign({ userId: user.id }, process.env.JWT_SECRET);
  return { user, token };
}`,
      },
      {
        path: 'components/LoginForm.tsx',
        type: 'added',
        originalContent: '',
        newContent: `import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Handle login
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <Button type="submit">Login</Button>
    </form>
  );
}`,
      },
    ]);
  };

  const header = (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onNavigate('/')}
        >
          <Home size={16} />
          Back to Dashboard
        </Button>
        <div className="h-8 w-px bg-border" />
        <h1 className="font-display text-xl font-bold tracking-tight uppercase">
          AutoCoder Workspace
        </h1>
      </div>
      
      <div className="flex items-center gap-4">
        <WorkflowStepper />
        <div className="h-8 w-px bg-border" />
        <Button
          variant="outline"
          size="sm"
          onClick={loadDemo}
        >
          Load Demo
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open('https://github.com/heidi-dang/autocoder', '_blank')}
        >
          <Github size={16} />
        </Button>
      </div>
    </div>
  );

  return (
    <WorkspaceLayout
      header={header}
      leftPane={<SpecPane />}
      centerPane={<PlannerPane />}
      rightPane={<CodePane />}
    />
  );
}
