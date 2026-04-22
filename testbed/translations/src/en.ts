export const english = {
  nav: {
    links: {
      home: "Home",
      dashboard: "Dashboard",
      settings: "Settings",
      help: "Help & Support",
      signOut: "Sign out",
      back: "Back"
    },
    mobile: {
      menu: {
        open: "Open menu",
        close: "Close menu"
      },
      drawer: {
        title: "Navigation"
      }
    }
  },
  dashboard: {
    header: {
      title: "Overview",
      welcome: "Welcome back, %{name}",
      summary: "Here's what's happening across your account."
    },
    activity: {
      lastUpdated: "Last updated %{time}",
      emptyState: "No data available yet. Get started by creating your first resource.",
      viewAll: "View all",
      learnMore: "Learn more"
    },
    widgets: {
      chart: {
        noData: "No chart data available",
        label: "Activity over time"
      },
      stats: {
        totalUsers: "Total users",
        revenue: "Revenue"
      }
    }
  },
  resources: {
    actions: {
      create: "Create resource",
      delete: "Delete resource",
      edit: "Edit resource",
      duplicate: "Duplicate resource",
      archive: "Archive resource"
    },
    list: {
      title: "Resources",
      searchPlaceholder: "Search resources…",
      empty: "You don't have any resources yet.",
      count: "%{count} resources"
    },
    detail: {
      meta: {
        createdAt: "Created %{date}",
        updatedAt: "Last modified %{date}",
        owner: "Owned by %{name}"
      }
    }
  },
  notifications: {
    inbox: {
      title: "Notifications",
      markRead: "Mark all as read",
      empty: "You're all caught up — no new notifications.",
      count: "%{count} new notifications"
    },
    preferences: {
      title: "Notification preferences",
      channels: {
        email: "Email notifications",
        push: "Push notifications",
        sms: "SMS notifications"
      }
    }
  },
  settings: {
    account: {
      title: "Account Settings",
      displayName: "Display name",
      email: "Email address",
      avatar: {
        upload: "Upload avatar",
        remove: "Remove avatar",
        crop: "Crop image"
      }
    },
    preferences: {
      general: "General",
      language: "Language",
      timezone: "Timezone",
      theme: {
        label: "Theme",
        light: "Light",
        dark: "Dark",
        system: "System default"
      }
    },
    actions: {
      save: "Save changes",
      cancel: "Cancel",
      reset: "Reset to defaults"
    }
  },
  errors: {
    http: {
      notFound: "The page you're looking for doesn't exist.",
      unauthorized: "You don't have permission to view this page.",
      timeout: "The request timed out. Please try again later.",
      server: {
        internal: "An internal server error occurred.",
        unavailable: "Service temporarily unavailable."
      }
    },
    form: {
      generic: "Something went wrong. Please try again.",
      validation: "Please fix the errors below.",
      required: "This field is required."
    },
    actions: {
      retry: "Retry",
      goBack: "Go back",
      contactSupport: "Contact support"
    }
  },
  confirm: {
    dialog: {
      title: "Are you sure?",
      deleteMessage: "This action cannot be undone.",
      yes: "Confirm",
      no: "Cancel"
    },
    toast: {
      success: "Action completed successfully.",
      error: "Something went wrong."
    }
  },
  status: {
    badge: {
      active: "Active",
      inactive: "Inactive",
      pending: "Pending",
      error: "Error"
    },
    indicator: {
      loading: "Loading…",
      success: "Success",
      enabled: "Enabled",
      disabled: "Disabled"
    }
  },
  auth: {
    login: {
      heading: "Sign in to your account",
      fields: {
        email: "Email",
        password: "Password",
        rememberMe: "Remember me"
      },
      actions: {
        submit: "Sign in",
        forgot: "Forgot password?"
      },
      errors: {
        invalidCredentials: "Invalid email or password.",
        accountLocked: {
          title: "Account locked",
          message: "Too many failed attempts. Try again in %{minutes} minutes."
        }
      }
    },
    register: {
      heading: "Create an account",
      fields: {
        name: "Full name",
        email: "Email",
        password: "Password",
        confirmPassword: "Confirm password"
      },
      actions: {
        submit: "Create account",
        existing: "Already have an account?"
      }
    },
    mfa: {
      setup: {
        title: "Set up two-factor authentication",
        scanQr: "Scan this QR code with your authenticator app"
      },
      verify: {
        title: "Enter verification code",
        placeholder: "6-digit code"
      }
    }
  },
  billing: {
    plans: {
      title: "Choose a plan",
      tiers: {
        free: {
          name: "Free",
          price: "$0/month",
          cta: "Get started"
        },
        pro: {
          name: "Pro",
          price: "$19/month",
          cta: "Upgrade to Pro"
        },
        enterprise: {
          name: "Enterprise",
          price: "Contact us",
          cta: "Talk to sales"
        }
      }
    },
    invoices: {
      title: "Billing history",
      columns: {
        date: "Date",
        amount: "Amount",
        status: "Status",
        download: "Download"
      },
      empty: "No invoices yet."
    },
    payment: {
      methods: {
        title: "Payment methods",
        add: "Add payment method",
        card: {
          endingIn: "ending in %{last4}",
          expires: "Expires %{date}"
        }
      }
    }
  },
  onboarding: {
    steps: {
      welcome: {
        title: "Welcome to the platform",
        description: "Let's get you set up in just a few steps."
      },
      profile: {
        title: "Complete your profile",
        description: "Tell us a bit about yourself."
      },
      invite: {
        title: "Invite your team",
        description: "Collaboration works best with others.",
        form: {
          emailPlaceholder: "colleague@company.com",
          send: "Send invite"
        }
      }
    },
    progress: {
      label: "Step %{current} of %{total}",
      skip: "Skip for now",
      next: "Continue",
      finish: "Finish setup"
    }
  },
  teams: {
    management: {
      title: "Team management",
      create: "Create team",
      delete: "Delete team",
      rename: "Rename team"
    },
    members: {
      title: "Team members",
      invite: "Invite member",
      remove: "Remove member",
      roles: {
        owner: "Owner",
        admin: "Admin",
        member: "Member",
        viewer: "Viewer",
        permissions: {
          read: "Can view",
          write: "Can edit",
          manage: "Can manage",
          billing: "Can manage billing"
        }
      }
    }
  },
  projects: {
    overview: {
      title: "Projects",
      create: "New project",
      empty: "No projects yet. Create your first one."
    },
    detail: {
      tabs: {
        overview: "Overview",
        files: "Files",
        activity: "Activity",
        settings: "Settings"
      },
      sidebar: {
        info: {
          created: "Created on %{date}",
          modified: "Last modified %{date}",
          size: "%{size} total"
        },
        tags: {
          title: "Tags",
          add: "Add tag",
          remove: "Remove tag",
          empty: "No tags"
        }
      }
    },
    sharing: {
      title: "Share project",
      link: {
        generate: "Generate share link",
        copy: "Copy link",
        expire: {
          label: "Link expiration",
          never: "Never",
          oneDay: "1 day",
          oneWeek: "1 week",
          oneMonth: "1 month"
        }
      },
      permissions: {
        viewOnly: "View only",
        canComment: "Can comment",
        canEdit: "Can edit"
      }
    }
  },
  search: {
    global: {
      placeholder: "Search everything…",
      noResults: "No results found for \"%{query}\"",
      filters: {
        type: {
          all: "All",
          projects: "Projects",
          resources: "Resources",
          people: "People"
        },
        date: {
          anyTime: "Any time",
          today: "Today",
          thisWeek: "This week",
          thisMonth: "This month"
        },
        sort: {
          relevance: "Most relevant",
          newest: "Newest first",
          oldest: "Oldest first"
        }
      }
    }
  },
  integrations: {
    catalog: {
      title: "Integrations",
      search: "Search integrations…",
      categories: {
        all: "All",
        analytics: "Analytics",
        communication: "Communication",
        storage: "Storage",
        devTools: "Developer tools"
      }
    },
    detail: {
      install: "Install",
      uninstall: "Uninstall",
      configure: "Configure",
      status: {
        connected: "Connected",
        disconnected: "Disconnected",
        error: "Connection error"
      },
      oauth: {
        authorize: "Authorize access",
        revoke: "Revoke access",
        scopes: {
          title: "Requested permissions",
          read: "Read your data",
          write: "Modify your data",
          admin: "Full administrative access"
        }
      }
    }
  },
  accessibility: {
    aria: {
      navigation: {
        main: "Main navigation",
        breadcrumb: "Breadcrumb",
        pagination: "Pagination"
      },
      actions: {
        expand: "Expand",
        collapse: "Collapse",
        dismiss: "Dismiss",
        close: "Close"
      }
    },
    screenReader: {
      skipToContent: "Skip to main content",
      announcements: {
        pageLoaded: "Page loaded",
        itemDeleted: "Item deleted",
        changesSaved: "Changes saved"
      }
    }
  },
  fileManager: {
    toolbar: {
      upload: "Upload file",
      newFolder: "New folder",
      download: "Download",
      rename: "Rename"
    },
    context: {
      cut: "Cut",
      copy: "Copy",
      paste: "Paste",
      moveTo: {
        label: "Move to…",
        recent: "Recent folders",
        browse: "Browse"
      }
    },
    preview: {
      unsupported: "Preview not available for this file type.",
      actions: {
        openInNew: "Open in new tab",
        share: "Share",
        print: "Print"
      }
    },
    storage: {
      usage: {
        label: "Storage used",
        of: "%{used} of %{total}",
        upgrade: "Upgrade storage"
      }
    }
  },
  comments: {
    thread: {
      reply: "Reply",
      resolve: "Resolve",
      reopen: "Reopen",
      delete: "Delete comment"
    },
    editor: {
      placeholder: "Write a comment…",
      submit: "Post comment",
      formatting: {
        bold: "Bold",
        italic: "Italic",
        link: "Insert link",
        mention: "Mention someone"
      }
    },
    reactions: {
      add: "Add reaction",
      remove: "Remove reaction",
      types: {
        thumbsUp: "Thumbs up",
        heart: "Heart",
        celebrate: "Celebrate",
        thinking: "Thinking"
      }
    }
  },
  analytics: {
    overview: {
      title: "Analytics",
      dateRange: {
        last7Days: "Last 7 days",
        last30Days: "Last 30 days",
        last90Days: "Last 90 days",
        custom: "Custom range"
      }
    },
    metrics: {
      pageViews: {
        title: "Page views",
        tooltip: "Total page views in selected period"
      },
      uniqueVisitors: {
        title: "Unique visitors",
        tooltip: "Distinct users who visited"
      },
      bounceRate: {
        title: "Bounce rate",
        tooltip: "Percentage of single-page sessions"
      },
      avgSessionDuration: {
        title: "Avg. session duration",
        tooltip: "Average time spent per session"
      }
    },
    export: {
      title: "Export data",
      formats: {
        csv: "Export as CSV",
        pdf: "Export as PDF",
        json: "Export as JSON"
      }
    }
  },
  auditLog: {
    title: "Audit log",
    filters: {
      actor: {
        label: "Performed by",
        placeholder: "Select user"
      },
      action: {
        label: "Action type",
        options: {
          created: "Created",
          updated: "Updated",
          deleted: "Deleted",
          shared: "Shared",
          exported: "Exported"
        }
      },
      dateRange: {
        label: "Date range",
        from: "From",
        to: "To"
      }
    },
    table: {
      columns: {
        timestamp: "Timestamp",
        actor: "User",
        action: "Action",
        target: "Target",
        details: "Details"
      },
      empty: "No audit events found."
    }
  },
  webhooks: {
    management: {
      title: "Webhooks",
      create: "Add webhook",
      delete: "Delete webhook"
    },
    form: {
      url: {
        label: "Endpoint URL",
        placeholder: "https://example.com/webhook"
      },
      events: {
        label: "Events to listen for",
        selectAll: "Select all",
        deselectAll: "Deselect all"
      },
      secret: {
        label: "Signing secret",
        generate: "Generate secret",
        copy: "Copy secret"
      }
    },
    delivery: {
      history: {
        title: "Recent deliveries",
        empty: "No deliveries yet."
      },
      status: {
        success: "Delivered",
        failed: "Failed",
        pending: "Pending"
      },
      detail: {
        request: {
          headers: "Request headers",
          body: "Request body"
        },
        response: {
          headers: "Response headers",
          body: "Response body",
          statusCode: "Status code"
        }
      }
    }
  }
} as const;
