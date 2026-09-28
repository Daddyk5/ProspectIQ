import {
  Activity, ArrowRight, ArrowUpRight, Bell, Bot, Building2, Calendar, ChartColumn, Check, ChevronRight,
  CircleCheck, Clock, Cloud, CodeXml, Command, Copy, Cpu, Database, Flame, Funnel, Globe, Info, Landmark,
  Layers, LayoutDashboard, Linkedin, Mail, Map, MapPin, Megaphone, Menu, MessageSquare, Mic, Network,
  Newspaper, Pause, Phone, Play, Radar, RefreshCw, Rocket, Search, Send, ShieldCheck, Sparkles, Target,
  TrendingDown, TrendingUp, UserPlus, Users, WandSparkles, Workflow, X, Zap, FileText, CornerDownLeft,
} from 'lucide-angular';
import { SignalKind, StepChannel } from '../core/models';

export const Icons = {
  Activity, ArrowRight, ArrowUpRight, Bell, Bot, Building2, Calendar, ChartColumn, Check, ChevronRight,
  CircleCheck, Clock, Cloud, CodeXml, Command, Copy, Cpu, Database, Flame, Funnel, Globe, Info, Landmark,
  Layers, LayoutDashboard, Linkedin, Mail, Map, MapPin, Megaphone, Menu, MessageSquare, Mic, Network,
  Newspaper, Pause, Phone, Play, Radar, RefreshCw, Rocket, Search, Send, ShieldCheck, Sparkles, Target,
  TrendingDown, TrendingUp, UserPlus, Users, WandSparkles, Workflow, X, Zap, FileText, CornerDownLeft,
};

export const SIGNAL_ICON: Record<SignalKind, typeof Flame> = {
  hiring: UserPlus,
  funding: Landmark,
  web: Flame,
  news: Newspaper,
  filing: FileText,
  tech: CodeXml,
};

export const CHANNEL_ICON: Record<StepChannel, typeof Flame> = {
  call: Phone,
  email: Mail,
  linkedin: Linkedin,
  crm: Cloud,
};
